def test_migration_blocking_index_deadlock():
    """Deterministic failure fixture simulating deadlock during blocking index build."""
    schema_deadlock = True
    assert not schema_deadlock, "Deadlock detected: exclusive table lock timed out"
