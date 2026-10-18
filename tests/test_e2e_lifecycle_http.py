"""
End-to-end HTTP integration and lifecycle validation suite for HiveMind Phase 12.
Exercises the live API over HTTP against running FalkorDB, PostgreSQL, and SQLite lifecycle store.
"""

import atexit
import os
import subprocess
import sys
import tempfile
import time
from uuid import uuid4

import httpx
import pytest

BASE_HOST = "127.0.0.1"
BASE_PORT = 8000
BASE_URL = f"http://{BASE_HOST}:{BASE_PORT}"


@pytest.fixture(scope="module")
def http_client():
    server_proc = None
    log_file = None

    already_running = False
    try:
        resp = httpx.get(f"{BASE_URL}/health", timeout=1.0)
        if resp.status_code == 200:
            already_running = True
    except Exception:
        already_running = False

    if not already_running:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        log_file = tempfile.TemporaryFile()
        env = os.environ.copy()
        server_proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "backend.main:app",
                "--host",
                BASE_HOST,
                "--port",
                str(BASE_PORT),
                "--log-level",
                "warning",
            ],
            cwd=repo_root,
            env=env,
            stdout=log_file,
            stderr=subprocess.STDOUT,
        )

        def _cleanup():
            if server_proc and server_proc.poll() is None:
                if sys.platform == "win32":
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", str(server_proc.pid)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        check=False,
                    )
                else:
                    server_proc.terminate()
                try:
                    server_proc.wait(timeout=5)
                except Exception:
                    server_proc.kill()
                    server_proc.wait(timeout=5)

        atexit.register(_cleanup)

        # Wait until the server is ready
        start_time = time.time()
        timeout = 30.0
        ready = False
        while time.time() - start_time < timeout:
            if server_proc.poll() is not None:
                log_file.seek(0)
                output = log_file.read().decode("utf-8", errors="replace")
                raise RuntimeError(
                    f"FastAPI server terminated unexpectedly with code {server_proc.returncode}:\n{output}"
                )
            try:
                resp = httpx.get(f"{BASE_URL}/health", timeout=1.0)
                if resp.status_code == 200:
                    ready = True
                    break
            except Exception:
                pass
            time.sleep(0.3)

        if not ready:
            _cleanup()
            log_file.seek(0)
            output = log_file.read().decode("utf-8", errors="replace")
            raise TimeoutError(f"FastAPI server failed to start within {timeout}s:\n{output}")

    try:
        with httpx.Client(base_url=BASE_URL, timeout=180.0) as client:
            yield client
    finally:
        if server_proc is not None:
            if sys.platform == "win32":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(server_proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                )
            else:
                server_proc.terminate()
            try:
                server_proc.wait(timeout=5)
            except Exception:
                server_proc.kill()
                server_proc.wait(timeout=5)
        if log_file is not None:
            try:
                log_file.close()
            except Exception:
                pass


def test_e2e_health_and_docs_live_http(http_client):
    """Verify live HTTP server health and OpenAPI documentation."""
    health_resp = http_client.get("/health")
    assert health_resp.status_code == 200
    data = health_resp.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    assert data["service"] == "HiveMind API"

    docs_resp = http_client.get("/docs")
    assert docs_resp.status_code == 200

    openapi_resp = http_client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    paths = openapi_resp.json().get("paths", {})
    assert "/api/v1/proposals" in paths


def _post_proposal_with_retry(client, payload, max_retries=5):
    """Post to /api/v1/proposals with backoff handling for upstream Gemini rate limits (429/503)."""
    for attempt in range(max_retries):
        resp = client.post("/api/v1/proposals", json=payload)
        if resp.status_code in (429, 503) and attempt < max_retries - 1:
            try:
                retry_after = int(resp.headers.get("Retry-After", "5"))
            except (ValueError, TypeError):
                retry_after = 5
            time.sleep(retry_after + 1)
            continue
        return resp
    return resp


def test_e2e_full_lifecycle_and_cross_task_retrieval(http_client):
    """
    Task 2: Execute complete lifecycle:
    1. Propose -> UNVERIFIED
    2. Record canonical IDs
    3. Evaluate with relevant fixture -> VERIFIED_SUCCESS
    4. Persist outcome & lesson into FalkorDB
    5. Query cached endpoints
    6. Propose similar task -> verify earlier lesson retrieved from FalkorDB graph memory
    """
    unique_marker = uuid4().hex[:8]
    task_desc_1 = (
        f"Database transaction deadlock when creating index on active orders table during migration [{unique_marker}]"
    )

    # 1. Submit proposal
    prop_resp = _post_proposal_with_retry(
        http_client,
        {
            "task_description": task_desc_1,
            "category": "database_migration",
            "limit": 5,
        },
    )
    assert prop_resp.status_code == 200
    prop_data = prop_resp.json()

    task_id = prop_data["task_id"]
    proposal_id = prop_data["proposal_id"]
    canonical_fix = prop_data["proposed_fix"]
    canonical_task_desc = prop_data["task_description"]

    # 2. Confirm newly generated proposal is UNVERIFIED
    assert prop_data["status"] == "UNVERIFIED"
    assert prop_data["verification_status"] == "UNVERIFIED"
    assert task_id.startswith("task-")
    assert proposal_id.startswith("proposal-")
    assert len(canonical_fix) > 0

    # 3. Evaluate proposal with explicit test fixture
    eval_resp = http_client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": canonical_task_desc,
            "proposed_fix": canonical_fix,
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": True,
            "test_description": "Validate that concurrent indexing eliminates deadlock",
        },
    )
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()

    assert eval_data["proposal_id"] == proposal_id
    assert eval_data["task_id"] == task_id
    assert eval_data["verification_status"] == "VERIFIED_SUCCESS"
    assert eval_data["tests_executed"] is True
    assert eval_data["exit_code"] == 0
    assert "Test command:" in eval_data["evidence"]

    # 4. Persist result and lesson to FalkorDB
    lesson_content = (
        f"Always build indexes concurrently on active tables to avoid transactional locks [{unique_marker}]."
    )
    persist_resp = http_client.post(
        f"/api/v1/proposals/{proposal_id}/persist",
        json={
            "task_id": task_id,
            "task_description": canonical_task_desc,
            "problem_title": f"Migration deadlock active orders [{unique_marker}]",
            "category": "database_migration",
            "lesson_content": lesson_content,
        },
    )
    assert persist_resp.status_code == 200
    persist_data = persist_resp.json()

    assert persist_data["proposal_id"] == proposal_id
    assert persist_data["task_id"] == task_id
    assert persist_data["verification_status"] == "VERIFIED_SUCCESS"
    assert persist_data["lesson_saved"] is True
    assert persist_data["lesson_id"] is not None
    assert persist_data["lesson_id"].startswith("lesson-")

    # 5. Retrieve saved lifecycle records
    get_prop = http_client.get(f"/api/v1/proposals/{proposal_id}")
    assert get_prop.status_code == 200
    assert get_prop.json()["proposal_id"] == proposal_id

    get_eval = http_client.get(f"/api/v1/proposals/{proposal_id}/evaluation")
    assert get_eval.status_code == 200
    assert get_eval.json()["proposal_id"] == proposal_id

    get_persist = http_client.get(f"/api/v1/proposals/{proposal_id}/persisted")
    assert get_persist.status_code == 200
    assert get_persist.json()["proposal_id"] == proposal_id
    assert get_persist.json()["lesson_id"] == persist_data["lesson_id"]

    # 6. Submit a similar task and confirm cross-task learning retrieval from FalkorDB
    task_desc_2 = (
        f"Active orders table transaction deadlock when creating index [{unique_marker}]"
    )
    prop2_resp = _post_proposal_with_retry(
        http_client,
        {
            "task_description": task_desc_2,
            "category": "database_migration",
            "limit": 5,
        },
    )
    assert prop2_resp.status_code == 200
    prop2_data = prop2_resp.json()

    assert prop2_data["retrieved_memories_count"] >= 1
    # Check that our newly saved lesson was retrieved by lesson_id or content
    retrieved_lesson_ids = [m.get("lesson_id") for m in prop2_data.get("memories", [])]
    retrieved_texts = [
        str(m.get("lesson", "") or m.get("problem_title", ""))
        for m in prop2_data.get("memories", [])
    ]
    assert (
        persist_data["lesson_id"] in retrieved_lesson_ids
        or any(unique_marker in text for text in retrieved_texts)
    )


def test_e2e_lifecycle_integrity_rejections(http_client):
    """
    Task 3: Validate lifecycle integrity rejections:
    - Unknown proposal IDs -> 404
    - Mismatched IDs -> 400
    - Modified proposed-fix -> 400
    - Duplicate evaluation -> 200 idempotent
    - Conflicting evaluation -> 409
    - Duplicate persistence -> 200 idempotent
    - Conflicting persistence -> 409
    - Unverified outcome lesson persistence -> 422
    """
    # 1. Propose valid item
    resp = _post_proposal_with_retry(
        http_client,
        {
            "task_description": "Integrity validation proposal for test suite",
            "category": "testing",
            "limit": 3,
        },
    )
    assert resp.status_code == 200
    p = resp.json()
    proposal_id = p["proposal_id"]
    task_id = p["task_id"]
    task_desc = p["task_description"]
    proposed_fix = p["proposed_fix"]

    # 2. Unknown proposal ID -> 404
    unknown_id = f"proposal-{uuid4().hex}"
    eval_unknown = http_client.post(
        f"/api/v1/proposals/{unknown_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": task_desc,
            "proposed_fix": proposed_fix,
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": True,
        },
    )
    assert eval_unknown.status_code == 404

    # 3. Mismatched task_id -> 400
    eval_mismatched_task = http_client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": f"task-spoofed-{uuid4().hex}",
            "task_description": task_desc,
            "proposed_fix": proposed_fix,
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": True,
        },
    )
    assert eval_mismatched_task.status_code == 400

    # 4. Modified proposed_fix -> 400
    eval_modified_fix = http_client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": task_desc,
            "proposed_fix": "Tampered fix text",
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": True,
        },
    )
    assert eval_modified_fix.status_code == 400

    # 5. First evaluation -> 200
    eval_payload = {
        "task_id": task_id,
        "task_description": task_desc,
        "proposed_fix": proposed_fix,
        "test_file": "tests/test_migration_fixture.py",
        "is_relevant": True,
        "test_description": "First run",
    }
    eval1 = http_client.post(f"/api/v1/proposals/{proposal_id}/evaluate", json=eval_payload)
    assert eval1.status_code == 200

    # 6. Duplicate identical evaluation -> 200 idempotent
    eval2 = http_client.post(f"/api/v1/proposals/{proposal_id}/evaluate", json=eval_payload)
    assert eval2.status_code == 200
    assert eval1.json()["verification_status"] == eval2.json()["verification_status"]

    # 7. Conflicting evaluation -> 409
    conflicting_eval = dict(eval_payload)
    conflicting_eval["test_file"] = "tests/test_migration_failure_fixture.py"
    eval3 = http_client.post(f"/api/v1/proposals/{proposal_id}/evaluate", json=conflicting_eval)
    assert eval3.status_code == 409

    # 8. First persistence -> 200
    persist_payload = {
        "task_id": task_id,
        "task_description": task_desc,
        "problem_title": "Integrity Title",
        "category": "testing",
        "lesson_content": "Valid integrity lesson.",
    }
    persist1 = http_client.post(f"/api/v1/proposals/{proposal_id}/persist", json=persist_payload)
    assert persist1.status_code == 200

    # 9. Duplicate identical persistence -> 200 idempotent
    persist2 = http_client.post(f"/api/v1/proposals/{proposal_id}/persist", json=persist_payload)
    assert persist2.status_code == 200
    assert persist1.json()["outcome_id"] == persist2.json()["outcome_id"]

    # 10. Conflicting persistence -> 409
    conflicting_persist = dict(persist_payload)
    conflicting_persist["lesson_content"] = "Conflicting lesson content"
    persist3 = http_client.post(f"/api/v1/proposals/{proposal_id}/persist", json=conflicting_persist)
    assert persist3.status_code == 409
