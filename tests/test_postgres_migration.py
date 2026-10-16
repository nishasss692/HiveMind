import os
import threading
import time
import pytest

try:
    import psycopg
    from psycopg import errors as pg_errors
except ImportError:
    psycopg = None
    pg_errors = None


def get_postgres_test_url() -> str | None:
    """Return a working test PostgreSQL connection URL or None if unavailable."""
    if psycopg is None:
        return None

    # Check explicit env var first
    explicit_url = os.getenv("POSTGRES_TEST_URL")
    candidates = [explicit_url] if explicit_url else [
        "postgresql://postgres:postgres@localhost:5433/hivemind_test",
        "postgresql://postgres:postgres@localhost:5432/hivemind_test",
    ]

    for url in candidates:
        if not url:
            continue
        try:
            with psycopg.connect(url, connect_timeout=2) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                    return url
        except Exception:
            continue

    return None


@pytest.fixture(scope="module")
def pg_conn_str():
    """Fixture providing PostgreSQL test connection string, skipping if unavailable."""
    url = get_postgres_test_url()
    if not url:
        pytest.skip(
            "PostgreSQL test database unavailable. "
            "Start the isolated test container (`docker run -d --name hivemind-postgres-test -p 5433:5432 "
            "-e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hivemind_test postgres:16-alpine`) "
            "or set POSTGRES_TEST_URL."
        )
    return url


@pytest.fixture(autouse=True)
def setup_test_table(pg_conn_str):
    """Set up and tear down a disposable table in the isolated test database."""
    with psycopg.connect(pg_conn_str, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DROP TABLE IF EXISTS orders_migration_test CASCADE;")
            cur.execute("""
                CREATE TABLE orders_migration_test (
                    id serial PRIMARY KEY,
                    customer_id int NOT NULL,
                    status text NOT NULL,
                    amount numeric NOT NULL,
                    created_at timestamp DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                INSERT INTO orders_migration_test (customer_id, status, amount)
                SELECT (g % 50) + 1,
                       CASE WHEN g % 2 = 0 THEN 'completed' ELSE 'pending' END,
                       (g * 2.5)
                FROM generate_series(1, 2000) AS g;
            """)
    yield
    with psycopg.connect(pg_conn_str, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DROP TABLE IF EXISTS orders_migration_test CASCADE;")


def test_1_create_table_and_concurrent_index(pg_conn_str):
    """1. Create a test table and build an index concurrently in PostgreSQL."""
    with psycopg.connect(pg_conn_str, autocommit=True) as conn:
        with conn.cursor() as cur:
            # Autocommit mode is required for CREATE INDEX CONCURRENTLY
            cur.execute(
                "CREATE INDEX CONCURRENTLY idx_orders_customer ON orders_migration_test (customer_id);"
            )
            cur.execute("""
                SELECT count(*) FROM orders_migration_test WHERE customer_id = 10;
            """)
            count = cur.fetchone()[0]
            assert count > 0, "Querying using the new index must return expected rows"


def test_2_create_index_concurrently_inside_transaction_rejected(pg_conn_str):
    """2. Confirm CREATE INDEX CONCURRENTLY cannot run inside a transaction block."""
    with psycopg.connect(pg_conn_str) as conn:
        with pytest.raises(pg_errors.ActiveSqlTransaction) as exc_info:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(
                        "CREATE INDEX CONCURRENTLY idx_txn_fail ON orders_migration_test (status);"
                    )
        # PostgreSQL error 25001: active_sql_transaction
        assert "cannot run inside a transaction block" in str(exc_info.value).lower()


def test_3_concurrent_reads_and_writes_during_index_creation(pg_conn_str):
    """3. Run concurrent read and write operations while an index is being built concurrently."""
    stop_event = threading.Event()
    worker_stats = {"reads": 0, "writes": 0, "errors": []}

    def background_traffic():
        try:
            with psycopg.connect(pg_conn_str, autocommit=True) as bg_conn:
                with bg_conn.cursor() as bg_cur:
                    while not stop_event.is_set():
                        bg_cur.execute(
                            "SELECT count(*) FROM orders_migration_test WHERE status = 'pending';"
                        )
                        _ = bg_cur.fetchone()
                        worker_stats["reads"] += 1

                        bg_cur.execute(
                            "INSERT INTO orders_migration_test (customer_id, status, amount) "
                            "VALUES (999, 'pending', 49.99);"
                        )
                        worker_stats["writes"] += 1
                        time.sleep(0.005)
        except Exception as e:
            worker_stats["errors"].append(str(e))

    traffic_thread = threading.Thread(target=background_traffic)
    traffic_thread.start()

    try:
        with psycopg.connect(pg_conn_str, autocommit=True) as idx_conn:
            with idx_conn.cursor() as idx_cur:
                idx_cur.execute(
                    "CREATE INDEX CONCURRENTLY idx_orders_status_amount "
                    "ON orders_migration_test (status, amount);"
                )
    finally:
        stop_event.set()
        traffic_thread.join(timeout=5)

    assert len(worker_stats["errors"]) == 0, f"Worker encountered errors: {worker_stats['errors']}"
    assert worker_stats["reads"] > 0, "Reads must have executed concurrently without deadlock"
    assert worker_stats["writes"] > 0, "Writes must have executed concurrently without deadlock"


def test_4_catalog_index_validity_check(pg_conn_str):
    """4. Confirm index is valid and ready in the pg_index catalog after creation."""
    with psycopg.connect(pg_conn_str, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "CREATE INDEX CONCURRENTLY idx_orders_customer_status "
                "ON orders_migration_test (customer_id, status);"
            )
            # Query PostgreSQL system catalog pg_index and pg_class
            cur.execute("""
                SELECT i.indisvalid, i.indisready, c.relname
                FROM pg_index i
                JOIN pg_class c ON c.oid = i.indexrelid
                WHERE c.relname = 'idx_orders_customer_status';
            """)
            row = cur.fetchone()
            assert row is not None, "Index record must exist in pg_class / pg_index"
            indisvalid, indisready, relname = row
            assert indisvalid is True, "pg_index.indisvalid must be True for a successful build"
            assert indisready is True, "pg_index.indisready must be True for read/write readiness"


def test_5_handle_interrupted_or_failed_concurrent_index(pg_conn_str):
    """5. Detect an invalid index and safely clean it up using DROP INDEX CONCURRENTLY."""
    with psycopg.connect(pg_conn_str, autocommit=True) as conn:
        with conn.cursor() as cur:
            # Force a duplicate key failure to create an INVALID index
            cur.execute(
                "INSERT INTO orders_migration_test (id, customer_id, status, amount) "
                "VALUES (100001, 42, 'dup', 10.0), (100002, 42, 'dup', 20.0);"
            )

            # Concurrent unique index fails due to duplicate key
            with pytest.raises(pg_errors.UniqueViolation):
                cur.execute(
                    "CREATE UNIQUE INDEX CONCURRENTLY idx_orders_unique_customer "
                    "ON orders_migration_test (customer_id);"
                )

            # In PostgreSQL, a failed CREATE INDEX CONCURRENTLY leaves behind an INVALID index
            cur.execute("""
                SELECT i.indisvalid, c.relname
                FROM pg_index i
                JOIN pg_class c ON c.oid = i.indexrelid
                WHERE c.relname = 'idx_orders_unique_customer';
            """)
            failed_index = cur.fetchone()
            assert failed_index is not None, "Failed concurrent index remains in catalog"
            assert failed_index[0] is False, "Failed index must have indisvalid = False"

            # Remediation: Drop the invalid index non-blockingly
            cur.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_orders_unique_customer;")

            # Verify it has been cleaned up
            cur.execute("""
                SELECT count(*) FROM pg_class WHERE relname = 'idx_orders_unique_customer';
            """)
            assert cur.fetchone()[0] == 0, "Invalid index should be dropped cleanly"
