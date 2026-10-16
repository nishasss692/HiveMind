from unittest.mock import patch
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.ai.agent_schemas import SolverResponse
from backend.main import app
from backend.services.orchestration import get_orchestration_service

client = TestClient(app)


def test_health_endpoints():
    """Verify health endpoints return healthy and database connected."""
    resp1 = client.get("/health")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] in {"healthy", "degraded"}
    assert data1["service"] == "HiveMind API"

    resp2 = client.get("/api/v1/health")
    assert resp2.status_code == 200
    assert resp2.json()["service"] == "HiveMind API"


def test_openapi_docs():
    """Verify OpenAPI and documentation endpoints are available."""
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    paths = resp.json().get("paths", {})
    assert "/api/v1/proposals" in paths
    assert "/api/v1/proposals/{proposal_id}/evaluate" in paths
    assert "/api/v1/proposals/{proposal_id}/persist" in paths


def test_proposal_creation_validation_errors():
    """Verify proposal endpoint validates empty descriptions and limits."""
    # Blank task description -> 400 Bad Request
    resp = client.post(
        "/api/v1/proposals",
        json={"task_description": "   ", "category": "database"},
    )
    assert resp.status_code == 400

    # Limit < 1 -> 400 Bad Request
    resp = client.post(
        "/api/v1/proposals",
        json={"task_description": "Valid description", "limit": 0},
    )
    assert resp.status_code == 400

    # Limit > 10 -> 400 Bad Request
    resp = client.post(
        "/api/v1/proposals",
        json={"task_description": "Valid description", "limit": 15},
    )
    assert resp.status_code == 400


def test_proposal_creation_mocked_solver():
    """Verify proposal generation returns UNVERIFIED proposal with consistent IDs."""
    fake_proposal = SolverResponse(
        proposal_id="proposal-test-123",
        diagnosis="Table locks cause deadlocks during migration.",
        proposed_fix="Execute concurrent index build.",
        reasoning="Non-blocking schema statements prevent table locks.",
        tests_to_run=["tests/test_migration_fixture.py"],
        memory_ids_used=[],
        risks=["Temporary background I/O."],
    )

    service = get_orchestration_service()
    with patch.object(service.orchestrator.solver, "propose", return_value=fake_proposal):
        response = client.post(
            "/api/v1/proposals",
            json={
                "task_description": "Deadlock during migration",
                "category": "database_migration",
                "limit": 3,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["task_id"].startswith("task-")
        assert data["proposal_id"].startswith("proposal-")
        # Critical: A newly generated proposal is ALWAYS UNVERIFIED
        assert data["status"] == "UNVERIFIED"
        assert data["verification_status"] == "UNVERIFIED"
        assert data["proposed_fix"] == "Execute concurrent index build."
        assert data["diagnosis"] == "Table locks cause deadlocks during migration."
        assert "tests/test_migration_fixture.py" in data["tests_to_run"]


def test_proposal_creation_invalid_or_placeholder_api_key():
    """Verify endpoint returns 503 with clear message when Gemini API rejects key."""
    from google.genai import errors as genai_errors

    client_err = genai_errors.ClientError(
        400,
        {"error": {"message": "API key not valid. Please pass a valid API key.", "status": "INVALID_ARGUMENT"}}
    )

    service = get_orchestration_service()
    with patch.object(service.orchestrator.solver, "propose", side_effect=client_err):
        response = client.post(
            "/api/v1/proposals",
            json={
                "task_description": "Deadlock during migration",
                "category": "database_migration",
                "limit": 3,
            },
        )
        assert response.status_code == 503
        data = response.json()
        assert "GEMINI_API_KEY" in data["detail"]
        assert "invalid" in data["detail"] or "placeholder" in data["detail"]


def test_proposal_creation_missing_api_key_runtime_error():
    """Verify endpoint returns 503 with clear message when GEMINI_API_KEY is missing."""
    runtime_err = RuntimeError(
        "GEMINI_API_KEY is missing. Add it to the .env file in your project root."
    )

    service = get_orchestration_service()
    with patch.object(service.orchestrator.solver, "propose", side_effect=runtime_err):
        response = client.post(
            "/api/v1/proposals",
            json={
                "task_description": "Deadlock during migration",
                "category": "database_migration",
                "limit": 3,
            },
        )
        assert response.status_code == 503
        data = response.json()
        assert "GEMINI_API_KEY" in data["detail"]


def test_evaluate_proposal_success_fixture():
    """Verify evaluate executes test fixture and reports VERIFIED_SUCCESS on exit code 0."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    eval_payload = {
        "task_id": task_id,
        "task_description": "Database deadlock when creating index",
        "proposed_fix": "Create index concurrently",
        "test_file": "tests/test_migration_fixture.py",
        "is_relevant": True,
        "test_description": "Verify concurrent index eliminates deadlock",
    }

    response = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json=eval_payload,
    )
    assert response.status_code == 200
    data = response.json()

    assert data["proposal_id"] == proposal_id
    assert data["task_id"] == task_id
    assert data["verification_status"] == "VERIFIED_SUCCESS"
    assert data["tests_executed"] is True
    assert data["exit_code"] == 0
    assert "Test command:" in data["evidence"]
    assert "Verification status: VERIFIED_SUCCESS" in data["evidence"]


def test_evaluate_proposal_failure_fixture():
    """Verify evaluate reports VERIFIED_FAILURE when test fixture fails."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    eval_payload = {
        "task_id": task_id,
        "task_description": "Simulate failing migration fixture",
        "proposed_fix": "Faulty blocking migration",
        "test_file": "tests/test_migration_failure_fixture.py",
        "is_relevant": True,
        "test_description": "Expect failure",
    }

    response = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json=eval_payload,
    )
    assert response.status_code == 200
    data = response.json()

    assert data["proposal_id"] == proposal_id
    # Critical: Failed tests must NEVER become VERIFIED_SUCCESS
    assert data["verification_status"] == "VERIFIED_FAILURE"
    assert data["tests_executed"] is True
    assert data["exit_code"] != 0


def test_evaluate_proposal_irrelevant_test():
    """Verify test marked as not relevant forces UNVERIFIED status."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    eval_payload = {
        "task_id": task_id,
        "task_description": "Database deadlock",
        "proposed_fix": "Concurrent index",
        "test_file": "tests/test_migration_fixture.py",
        "is_relevant": False,  # Irrelevant!
        "test_description": "Irrelevant smoke test",
    }

    response = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json=eval_payload,
    )
    assert response.status_code == 200
    data = response.json()

    assert data["verification_status"] == "UNVERIFIED"
    assert "not designated as relevant" in data["evidence"]


def test_evaluate_sandbox_path_traversal_forbidden():
    """Verify attempts to run test files outside tests/ are rejected with 403 Forbidden."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    # Target path outside tests/
    eval_payload = {
        "task_id": task_id,
        "task_description": "Path traversal attempt",
        "proposed_fix": "Fix",
        "test_file": "../app/ai/test_runner.py",
        "is_relevant": True,
    }

    response = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json=eval_payload,
    )
    assert response.status_code == 403
    assert "tests directory" in response.json()["detail"].lower()


def test_evaluate_missing_test_file_not_found():
    """Verify non-existent test file returns 404 Not Found."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    eval_payload = {
        "task_id": task_id,
        "task_description": "Missing file",
        "proposed_fix": "Fix",
        "test_file": "tests/non_existent_fixture.py",
        "is_relevant": True,
    }

    response = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json=eval_payload,
    )
    assert response.status_code == 404


def test_persist_evaluated_success_with_lesson_real_falkordb():
    """Verify end-to-end evaluation and persistence in FalkorDB."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    # 1. Evaluate proposal
    eval_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": "Concurrent index schema deadlock",
            "proposed_fix": "Use concurrent index builds",
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": True,
        },
    )
    assert eval_resp.status_code == 200
    assert eval_resp.json()["verification_status"] == "VERIFIED_SUCCESS"

    # 2. Persist verification and lesson
    lesson_text = "Always build indexes concurrently on active tables to prevent deadlocks."
    persist_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/persist",
        json={
            "task_id": task_id,
            "task_description": "Concurrent index schema deadlock",
            "problem_title": "Active table schema deadlock",
            "category": "database_migration",
            "lesson_content": lesson_text,
        },
    )
    assert persist_resp.status_code == 200
    data = persist_resp.json()

    assert data["proposal_id"] == proposal_id
    assert data["task_id"] == task_id
    assert data["verification_status"] == "VERIFIED_SUCCESS"
    assert data["lesson_saved"] is True
    assert data["lesson_id"] is not None
    assert data["lesson_id"].startswith("lesson-")
    assert data["outcome_id"] == f"outcome-attempt-{proposal_id}"


def test_persist_verified_success_missing_lesson_rejected():
    """Verify verified outcome without lesson_content raises 422 Unprocessable Entity."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    # Evaluate first to get VERIFIED_SUCCESS
    eval_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": "Deadlock migration",
            "proposed_fix": "Concurrent index",
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": True,
        },
    )
    assert eval_resp.status_code == 200

    # Persist without lesson_content -> 422 Unprocessable Entity
    persist_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/persist",
        json={
            "task_id": task_id,
            "task_description": "Deadlock migration",
            "problem_title": "Deadlock title",
            "category": "database_migration",
            "lesson_content": None,  # Missing!
        },
    )
    assert persist_resp.status_code == 422
    assert "lesson_content" in persist_resp.json()["detail"].lower()


def test_persist_unverified_never_saves_lesson():
    """Verify unverified outcome does not save a Lesson node."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    # Evaluate with is_relevant=False -> status is UNVERIFIED
    eval_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": "Unverified proposal",
            "proposed_fix": "Fix",
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": False,
        },
    )
    assert eval_resp.status_code == 200
    assert eval_resp.json()["verification_status"] == "UNVERIFIED"

    # Persist -> lesson must NOT be saved
    persist_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/persist",
        json={
            "task_id": task_id,
            "task_description": "Unverified proposal",
            "problem_title": "Unverified problem",
            "category": "database_migration",
            "lesson_content": "Attempted lesson from unverified outcome",
        },
    )
    assert persist_resp.status_code == 200
    data = persist_resp.json()

    assert data["verification_status"] == "UNVERIFIED"
    assert data["lesson_saved"] is False
    assert data["lesson_id"] is None


def test_persist_unevaluated_proposal_rejected():
    """Verify attempting to persist a proposal that was never evaluated fails."""
    unseen_proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    persist_resp = client.post(
        f"/api/v1/proposals/{unseen_proposal_id}/persist",
        json={
            "task_id": task_id,
            "task_description": "Never evaluated",
            "problem_title": "Problem",
            "category": "database",
            "lesson_content": "Lesson",
        },
    )
    assert persist_resp.status_code in {400, 422}


def test_malformed_identifier_rejected():
    """Verify malformed task_id and proposal_id are rejected with 400 Bad Request."""
    # Proposal ID containing illegal characters
    resp1 = client.post(
        "/api/v1/proposals/invalid%20proposal%20id/evaluate",
        json={
            "task_id": "task-valid-123",
            "task_description": "Task",
            "proposed_fix": "Fix",
            "test_file": "tests/test_migration_fixture.py",
        },
    )
    assert resp1.status_code == 400

    # Task ID with illegal characters
    resp2 = client.post(
        f"/api/v1/proposals/proposal-{uuid4().hex}/evaluate",
        json={
            "task_id": "invalid task id with spaces",
            "task_description": "Task",
            "proposed_fix": "Fix",
            "test_file": "tests/test_migration_fixture.py",
        },
    )
    assert resp2.status_code == 400


def test_gemini_rate_limit_429():
    """Verify Gemini quota/rate limits return 429 Too Many Requests with Retry-After."""
    from google.genai import errors as genai_errors

    rate_err = genai_errors.ClientError(
        429,
        {"error": {"code": 429, "message": "Resource has been exhausted (e.g. check quota)."}}
    )
    service = get_orchestration_service()
    with patch.object(service.orchestrator.solver, "propose", side_effect=rate_err):
        response = client.post(
            "/api/v1/proposals",
            json={
                "task_description": "Deadlock during migration",
                "category": "database_migration",
                "limit": 3,
            },
        )
        assert response.status_code == 429
        assert "Retry-After" in response.headers
        assert response.headers["Retry-After"] == "5"


def test_gemini_server_error_503():
    """Verify Gemini server-side errors return 503 Service Unavailable with Retry-After."""
    from google.genai import errors as genai_errors

    server_err = genai_errors.ServerError(
        503,
        {"error": {"code": 503, "message": "The model is temporarily overloaded."}}
    )
    service = get_orchestration_service()
    with patch.object(service.orchestrator.solver, "propose", side_effect=server_err):
        response = client.post(
            "/api/v1/proposals",
            json={
                "task_description": "Deadlock during migration",
                "category": "database_migration",
                "limit": 3,
            },
        )
        assert response.status_code == 503
        assert "Retry-After" in response.headers
        assert response.headers["Retry-After"] == "5"


def test_falkordb_connection_failure_502():
    """Verify FalkorDB connection error surfaces clean 502 Bad Gateway response."""
    import redis.exceptions

    conn_err = redis.exceptions.ConnectionError("Connection refused to FalkorDB on port 6379")
    service = get_orchestration_service()
    with patch.object(service.orchestrator.investigator, "investigate", side_effect=conn_err):
        response = client.post(
            "/api/v1/proposals",
            json={
                "task_description": "Deadlock during migration",
                "category": "database_migration",
                "limit": 3,
            },
        )
        assert response.status_code == 502
        assert "FalkorDB is unreachable" in response.json()["detail"]


def test_test_runner_timeout_yields_unverified():
    """Verify a timed-out test run safely reports UNVERIFIED and does not claim success."""
    from app.ai.verifier import TestExecutionResult

    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    timed_out_execution = TestExecutionResult(
        command="python -m pytest tests/test_migration_fixture.py -q",
        exit_code=None,
        tests_executed=False,
        stderr="Test run timed out after 60 seconds.",
        test_file="tests/test_migration_fixture.py",
    )

    service = get_orchestration_service()
    with patch.object(service.orchestrator.test_runner, "run", return_value=timed_out_execution):
        response = client.post(
            f"/api/v1/proposals/{proposal_id}/evaluate",
            json={
                "task_id": task_id,
                "task_description": "Deadlock migration",
                "proposed_fix": "Fix",
                "test_file": "tests/test_migration_fixture.py",
                "is_relevant": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verification_status"] == "UNVERIFIED"
        assert data["tests_executed"] is False
        assert data["exit_code"] is None
        assert "timed out" in data["evidence"].lower()


def test_failed_verification_persisted_with_lesson():
    """Verify a VERIFIED_FAILURE can be persisted with lesson and creates a FailureRecord."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    # 1. Evaluate with failing fixture
    eval_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": "Failing migration test",
            "proposed_fix": "Blocking index build",
            "test_file": "tests/test_migration_failure_fixture.py",
            "is_relevant": True,
        },
    )
    assert eval_resp.status_code == 200
    assert eval_resp.json()["verification_status"] == "VERIFIED_FAILURE"

    # 2. Persist with lesson explaining the negative outcome
    lesson_text = "Blocking index creation creates exclusive table locks that lead to deadlocks."
    persist_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/persist",
        json={
            "task_id": task_id,
            "task_description": "Failing migration test",
            "problem_title": "Blocking index failure",
            "category": "database_migration",
            "lesson_content": lesson_text,
        },
    )
    assert persist_resp.status_code == 200
    data = persist_resp.json()
    assert data["verification_status"] == "VERIFIED_FAILURE"
    assert data["lesson_saved"] is True
    assert data["lesson_id"] is not None
    assert data["lesson_id"].startswith("lesson-")


def test_repeated_persistence_idempotency():
    """Verify repeated persistence requests return the exact same outcome idempotently."""
    proposal_id = f"proposal-{uuid4().hex}"
    task_id = f"task-{uuid4().hex}"

    # 1. Evaluate
    eval_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": "Idempotency migration test",
            "proposed_fix": "Concurrent index build",
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": True,
        },
    )
    assert eval_resp.status_code == 200

    payload = {
        "task_id": task_id,
        "task_description": "Idempotency migration test",
        "problem_title": "Idempotency problem",
        "category": "database_migration",
        "lesson_content": "Always build concurrent indexes on active tables.",
    }

    # 2. First persist call
    resp1 = client.post(f"/api/v1/proposals/{proposal_id}/persist", json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()

    # 3. Second persist call
    resp2 = client.post(f"/api/v1/proposals/{proposal_id}/persist", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()

    # Exactly identical IDs and status
    assert data1["lesson_id"] == data2["lesson_id"]
    assert data1["outcome_id"] == data2["outcome_id"]
    assert data1["verification_status"] == data2["verification_status"]


def test_query_cached_proposal_evaluation_and_persisted():
    """Verify GET endpoints retrieve cached records and return 404 for unknown IDs."""
    fake_proposal = SolverResponse(
        proposal_id="proposal-cached-001",
        diagnosis="Diagnosis",
        proposed_fix="Fix",
        reasoning="Reasoning",
        tests_to_run=["tests/test_migration_fixture.py"],
        memory_ids_used=[],
        risks=[],
    )

    service = get_orchestration_service()
    with patch.object(service.orchestrator.solver, "propose", return_value=fake_proposal):
        create_resp = client.post(
            "/api/v1/proposals",
            json={"task_description": "Cached proposal test", "limit": 2},
        )
        assert create_resp.status_code == 200
        proposal_id = create_resp.json()["proposal_id"]
        task_id = create_resp.json()["task_id"]

    # 1. Query proposal details
    get_prop_resp = client.get(f"/api/v1/proposals/{proposal_id}")
    assert get_prop_resp.status_code == 200
    assert get_prop_resp.json()["proposal_id"] == proposal_id

    # 2. Evaluate
    client.post(
        f"/api/v1/proposals/{proposal_id}/evaluate",
        json={
            "task_id": task_id,
            "task_description": "Cached proposal test",
            "proposed_fix": "Fix",
            "test_file": "tests/test_migration_fixture.py",
            "is_relevant": True,
        },
    )

    # 3. Query evaluation
    get_eval_resp = client.get(f"/api/v1/proposals/{proposal_id}/evaluation")
    assert get_eval_resp.status_code == 200
    assert get_eval_resp.json()["proposal_id"] == proposal_id

    # 4. Persist
    client.post(
        f"/api/v1/proposals/{proposal_id}/persist",
        json={
            "task_id": task_id,
            "task_description": "Cached proposal test",
            "problem_title": "Cached problem",
            "category": "testing",
            "lesson_content": "A cached lesson.",
        },
    )

    # 5. Query persisted record
    get_persisted_resp = client.get(f"/api/v1/proposals/{proposal_id}/persisted")
    assert get_persisted_resp.status_code == 200
    assert get_persisted_resp.json()["proposal_id"] == proposal_id

    # 6. Unknown IDs return 404
    unknown_id = f"proposal-{uuid4().hex}"
    assert client.get(f"/api/v1/proposals/{unknown_id}").status_code == 404
    assert client.get(f"/api/v1/proposals/{unknown_id}/evaluation").status_code == 404
    assert client.get(f"/api/v1/proposals/{unknown_id}/persisted").status_code == 404
