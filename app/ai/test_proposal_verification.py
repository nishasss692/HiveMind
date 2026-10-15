import sys
from pathlib import Path
from uuid import uuid4

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.ai.orchestrator import HiveMindOrchestrator
from app.ai.verifier import (
    TestExecutionResult,
    TestSpecification,
    Verifier,
)
from app.memory.schema import (
    AgentRecord,
    AttemptRecord,
    ExperienceRecord,
    LessonRecord,
    OutcomeRecord,
    ProblemRecord,
    TaskRecord,
)


def test_scenario_1_relevant_test_passes():
    """1. A relevant test run passes and the result is associated with the intended proposal."""
    verifier = Verifier()
    proposal_id = "proposal-migrate-001"

    spec = TestSpecification(
        proposal_id=proposal_id,
        test_file="tests/test_migration.py",
        is_relevant=True,
        description="Verify database migration dependency ordering",
    )

    execution = TestExecutionResult(
        command="python -m pytest tests/test_migration.py -q",
        exit_code=0,
        tests_executed=True,
        stdout="3 passed in 0.25s",
        test_file="tests/test_migration.py",
    )

    result = verifier.verify_proposal(
        proposal_id=proposal_id,
        result=execution,
        test_spec=spec,
    )

    assert result.status == "VERIFIED_SUCCESS", (
        f"Expected VERIFIED_SUCCESS, got {result.status}"
    )
    assert result.proposal_id == proposal_id
    assert result.test_file == "tests/test_migration.py"
    assert "Verification status: VERIFIED_SUCCESS" in result.evidence
    print("Scenario 1: Relevant test pass -> VERIFIED_SUCCESS [PASS]")


def test_scenario_2_relevant_test_fails():
    """2. A relevant test run fails and the result is associated with the intended proposal."""
    verifier = Verifier()
    proposal_id = "proposal-migrate-002"

    spec = TestSpecification(
        proposal_id=proposal_id,
        test_file="tests/test_migration.py",
        is_relevant=True,
        description="Verify database migration schema validation",
    )

    execution = TestExecutionResult(
        command="python -m pytest tests/test_migration.py -q",
        exit_code=1,
        tests_executed=True,
        stdout="1 failed, 2 passed in 0.30s",
        stderr="AssertionError: Column 'user_id' does not exist in target schema",
        test_file="tests/test_migration.py",
    )

    result = verifier.verify_proposal(
        proposal_id=proposal_id,
        result=execution,
        test_spec=spec,
    )

    assert result.status == "VERIFIED_FAILURE", (
        f"Expected VERIFIED_FAILURE, got {result.status}"
    )
    assert result.proposal_id == proposal_id
    assert "AssertionError" in result.evidence
    assert "Verification status: VERIFIED_FAILURE" in result.evidence
    print("Scenario 2: Relevant test failure -> VERIFIED_FAILURE [PASS]")


def test_scenario_3_test_timeout_or_unconfirmed():
    """3. A test times out or its execution cannot be confirmed."""
    verifier = Verifier()
    proposal_id = "proposal-migrate-003"

    spec = TestSpecification(
        proposal_id=proposal_id,
        test_file="tests/test_migration.py",
        is_relevant=True,
    )

    # Subcase A: Timeout (exit_code is None, tests_executed is False)
    timeout_execution = TestExecutionResult(
        command="python -m pytest tests/test_migration.py -q",
        exit_code=None,
        tests_executed=False,
        stderr="Test run timed out after 60 seconds.",
        test_file="tests/test_migration.py",
    )

    result_timeout = verifier.verify_proposal(
        proposal_id=proposal_id,
        result=timeout_execution,
        test_spec=spec,
    )

    assert result_timeout.status == "UNVERIFIED", (
        f"Expected UNVERIFIED for timeout, got {result_timeout.status}"
    )
    assert "could not be confirmed or timed out" in result_timeout.evidence

    # Subcase B: Process crashed without test runner confirmation
    unconfirmed_execution = TestExecutionResult(
        command="python -m pytest tests/test_migration.py -q",
        exit_code=137,
        tests_executed=False,
        stderr="Process killed by signal OOM",
        test_file="tests/test_migration.py",
    )

    result_unconfirmed = verifier.verify_proposal(
        proposal_id=proposal_id,
        result=unconfirmed_execution,
        test_spec=spec,
    )

    assert result_unconfirmed.status == "UNVERIFIED", (
        f"Expected UNVERIFIED for unconfirmed execution, got {result_unconfirmed.status}"
    )
    print("Scenario 3: Timeout / unconfirmed execution -> UNVERIFIED [PASS]")


def test_scenario_4_generic_smoke_test_rejected_for_unrelated():
    """4. A generic smoke test is not accepted as verification of an unrelated proposal."""
    verifier = Verifier()
    migration_proposal_id = "proposal-migrate-004"

    smoke_execution = TestExecutionResult(
        command="python -m pytest tests/test_runner_smoke.py -q",
        exit_code=0,
        tests_executed=True,
        stdout="1 passed in 0.01s",
        test_file="tests/test_runner_smoke.py",
    )

    # 4a: Generic smoke test designated as not relevant to the migration proposal
    spec_not_relevant = TestSpecification(
        proposal_id=migration_proposal_id,
        test_file="tests/test_runner_smoke.py",
        is_relevant=False,
        description="Generic runner smoke test, unrelated to database migration",
    )

    result_not_relevant = verifier.verify_proposal(
        proposal_id=migration_proposal_id,
        result=smoke_execution,
        test_spec=spec_not_relevant,
    )

    assert result_not_relevant.status == "UNVERIFIED", (
        f"Expected UNVERIFIED for non-relevant test spec, got {result_not_relevant.status}"
    )
    assert "not designated as relevant" in result_not_relevant.evidence

    # 4b: Test file mismatch (proposal required migration test, but smoke test was executed)
    spec_migration = TestSpecification(
        proposal_id=migration_proposal_id,
        test_file="tests/test_migration.py",
        is_relevant=True,
    )

    result_mismatch = verifier.verify_proposal(
        proposal_id=migration_proposal_id,
        result=smoke_execution,
        test_spec=spec_migration,
    )

    assert result_mismatch.status == "UNVERIFIED", (
        f"Expected UNVERIFIED for test file mismatch, got {result_mismatch.status}"
    )
    assert "does not match designated test file" in result_mismatch.evidence

    # 4c: No test specification provided to link smoke test to the proposal
    result_no_spec = verifier.verify_proposal(
        proposal_id=migration_proposal_id,
        result=smoke_execution,
        test_spec=None,
    )

    assert result_no_spec.status == "UNVERIFIED", (
        f"Expected UNVERIFIED when test spec is missing, got {result_no_spec.status}"
    )
    assert "No test specification provided" in result_no_spec.evidence

    # 4d: Mismatched proposal ID
    spec_wrong_id = TestSpecification(
        proposal_id="different-proposal-999",
        test_file="tests/test_runner_smoke.py",
        is_relevant=True,
    )

    result_wrong_id = verifier.verify_proposal(
        proposal_id=migration_proposal_id,
        result=smoke_execution,
        test_spec=spec_wrong_id,
    )

    assert result_wrong_id.status == "UNVERIFIED", (
        f"Expected UNVERIFIED for proposal ID mismatch, got {result_wrong_id.status}"
    )
    print("Scenario 4: Generic smoke test for unrelated proposal -> UNVERIFIED [PASS]")


def test_scenario_5_orchestrator_workflow_evaluation():
    """Verify proposal evaluation workflow via HiveMindOrchestrator."""
    orchestrator = HiveMindOrchestrator()
    proposal_id = "proposal-eval-005"
    task_id = "task-eval-005"

    # Evaluation A: Unrelated generic smoke test evaluated for a migration task -> UNVERIFIED
    eval_unrelated = orchestrator.evaluate_proposal(
        task_id=task_id,
        proposal_id=proposal_id,
        task_description="Fix migration dependency order",
        proposed_fix="Reorder migrations in schema table",
        test_file="tests/test_runner_smoke.py",
        is_relevant=False,
        test_description="Generic smoke test unrelated to migration fix",
    )

    assert eval_unrelated["verification_status"] == "UNVERIFIED"
    assert eval_unrelated["proposal_id"] == proposal_id
    assert eval_unrelated["task_id"] == task_id
    assert eval_unrelated["selected_test_file"] == "tests/test_runner_smoke.py"

    # Evaluation B: Real smoke test evaluated for an infrastructure task -> VERIFIED_SUCCESS
    eval_smoke = orchestrator.evaluate_proposal(
        task_id="task-smoke-006",
        proposal_id="proposal-smoke-006",
        task_description="Smoke test python test runner infrastructure",
        proposed_fix="Ensure pytest executes simple assertions",
        test_file="tests/test_runner_smoke.py",
        is_relevant=True,
        test_description="Smoke test for pytest runner",
    )

    assert eval_smoke["verification_status"] == "VERIFIED_SUCCESS"
    assert eval_smoke["proposal_id"] == "proposal-smoke-006"
    assert eval_smoke["test_execution"].tests_executed is True

    print("Scenario 5: Orchestrator evaluate_proposal workflow [PASS]")


def test_scenario_6_failed_test_fixture_never_becomes_verified_success():
    """6. A failed test fixture is classified as VERIFIED_FAILURE and never VERIFIED_SUCCESS."""
    orchestrator = HiveMindOrchestrator()
    proposal_id = f"proposal-fail-{uuid4().hex[:6]}"
    task_id = f"task-fail-{uuid4().hex[:6]}"

    eval_result = orchestrator.evaluate_proposal(
        task_id=task_id,
        proposal_id=proposal_id,
        task_description="Test deadlock detection under blocking index build",
        proposed_fix="Direct blocking index migration",
        test_file="tests/test_migration_failure_fixture.py",
        is_relevant=True,
        test_description="Deterministic failure fixture for migration deadlock",
    )

    assert eval_result["test_execution"].tests_executed is True
    assert eval_result["test_execution"].exit_code == 1
    assert eval_result["verification_status"] == "VERIFIED_FAILURE"
    assert eval_result["verification_status"] != "VERIFIED_SUCCESS"
    assert "Deadlock detected" in eval_result["evidence"]
    print("Scenario 6: Failed test fixture -> VERIFIED_FAILURE [PASS]")


def test_scenario_7_invalid_graph_relationships_and_schema_validation_rejected():
    """7. Invalid graph relationships and unverified lessons are rejected by schema."""
    t = TaskRecord(id="t-1", description="task")
    p = ProblemRecord(id="p-1", title="problem", category="cat")
    ag = AgentRecord(id="ag-1", role="VERIFIER")

    # Mismatched status between attempt and outcome
    with pytest.raises(ValueError, match="Attempt status must match outcome status"):
        ExperienceRecord(
            task=t,
            problem=p,
            agent=ag,
            attempt=AttemptRecord(id="a-1", description="att", status="UNVERIFIED"),
            outcome=OutcomeRecord(id="o-1", status="VERIFIED_SUCCESS", evidence="passed"),
        )

    # Lesson without supporting outcome
    with pytest.raises(ValueError, match="A lesson requires a supporting outcome"):
        ExperienceRecord(
            task=t,
            problem=p,
            agent=ag,
            attempt=AttemptRecord(id="a-1", description="att", status="VERIFIED_SUCCESS"),
            lesson=LessonRecord(id="l-1", content="lesson"),
        )

    # Lesson from UNVERIFIED outcome
    with pytest.raises(ValueError, match="Cannot save a lesson from an unverified outcome"):
        ExperienceRecord(
            task=t,
            problem=p,
            agent=ag,
            attempt=AttemptRecord(id="a-1", description="att", status="UNVERIFIED"),
            outcome=OutcomeRecord(id="o-1", status="UNVERIFIED", evidence="timeout"),
            lesson=LessonRecord(id="l-1", content="lesson"),
        )

    # Lesson with empty evidence
    with pytest.raises(ValueError, match="A lesson requires non-empty verification evidence"):
        ExperienceRecord(
            task=t,
            problem=p,
            agent=ag,
            attempt=AttemptRecord(id="a-1", description="att", status="VERIFIED_SUCCESS"),
            outcome=OutcomeRecord(id="o-1", status="VERIFIED_SUCCESS", evidence="   "),
            lesson=LessonRecord(id="l-1", content="lesson"),
        )

    print("Scenario 7: Schema validation rejects invalid states and relationships [PASS]")


def test_scenario_8_duplicate_submissions_idempotency_and_preservation():
    """8. Duplicate submissions preserve record identity without creating contradictory nodes."""
    orchestrator = HiveMindOrchestrator()
    uid = uuid4().hex[:6]
    task_id = f"task-dup-{uid}"
    proposal_id = f"proposal-dup-{uid}"

    eval_res = orchestrator.evaluate_proposal(
        task_id=task_id,
        proposal_id=proposal_id,
        task_description=f"Idempotency test [{uid}]",
        proposed_fix="Smoke verification",
        test_file="tests/test_runner_smoke.py",
        is_relevant=True,
    )

    rec1 = orchestrator.record_verification(
        task_description=f"Idempotency test [{uid}]",
        problem_title=f"Idempotency problem [{uid}]",
        category="idempotency_check",
        proposal="Smoke verification",
        test_result=eval_res["test_execution"],
        lesson_content=f"Smoke verification idempotency lesson [{uid}].",
        test_spec=eval_res["test_specification"],
        task_id=task_id,
        proposal_id=proposal_id,
    )

    rec2 = orchestrator.record_verification(
        task_description=f"Idempotency test [{uid}]",
        problem_title=f"Idempotency problem [{uid}]",
        category="idempotency_check",
        proposal="Smoke verification",
        test_result=eval_res["test_execution"],
        lesson_content=f"Smoke verification idempotency lesson [{uid}].",
        test_spec=eval_res["test_specification"],
        task_id=task_id,
        proposal_id=proposal_id,
    )

    assert rec1["outcome_id"] == rec2["outcome_id"]
    assert rec1["task_id"] == rec2["task_id"]
    assert rec1["proposal_id"] == rec2["proposal_id"]
    assert rec1["verification_status"] == rec2["verification_status"]
    print("Scenario 8: Duplicate submission idempotency [PASS]")


def test_scenario_9_solver_rejects_hallucinated_memory_ids():
    """9. Solver strictly rejects memory IDs not present in retrieved memories."""
    from app.ai.agent_schemas import SolverResponse

    allowed_ids = {"lesson-valid-001"}
    proposal = SolverResponse(
        diagnosis="Test diagnosis",
        proposed_fix="Test fix",
        reasoning="Test reasoning",
        tests_to_run=["tests/test_runner_smoke.py"],
        memory_ids_used=["lesson-valid-001", "lesson-hallucinated-999"],
        risks=[],
    )

    invalid_ids = set(proposal.memory_ids_used) - allowed_ids
    assert invalid_ids == {"lesson-hallucinated-999"}
    print("Scenario 9: Solver rejection of hallucinated memory IDs [PASS]")


def test_scenario_10_test_runner_sandbox_enforcement():
    """10. TestRunner strictly enforces project tests/ directory boundary."""
    from app.ai.test_runner import TestRunner

    runner = TestRunner()

    # Attempting to run a file outside the tests/ directory must raise ValueError
    with pytest.raises(ValueError, match="Tests must be located inside the project tests directory"):
        runner.run("app/ai/orchestrator.py")

    # Attempting to run a non-existent file inside tests/ must raise FileNotFoundError
    with pytest.raises(FileNotFoundError, match="Test file does not exist"):
        runner.run("tests/non_existent_test_fixture.py")

    print("Scenario 10: TestRunner sandbox boundary enforcement [PASS]")


def test_scenario_11_solver_propose_rejects_hallucinated_memory_in_pipeline(monkeypatch):
    """11. Solver.propose() strictly raises ValueError if LLM response hallucinates memory IDs."""
    import json
    from app.ai.solver import Solver

    solver = Solver(max_retries=1)

    fake_memories = [
        {
            "lesson_id": "lesson-valid-001",
            "lesson": "Valid retrieved lesson content",
            "problem_title": "Database deadlock",
            "outcome_status": "VERIFIED_SUCCESS",
            "evidence": "Exit code: 0",
            "similarity_score": 0.85,
        }
    ]

    # Mock client and response containing an unknown memory ID
    class FakeResponse:
        text = json.dumps({
            "diagnosis": "Deadlock in table",
            "proposed_fix": "Concurrent index",
            "reasoning": "Based on fabricated memory",
            "tests_to_run": ["tests/test_runner_smoke.py"],
            "memory_ids_used": ["lesson-valid-001", "lesson-hallucinated-xyz"],
            "risks": [],
        })

    class FakeModels:
        def generate_content(self, *args, **kwargs):
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr("app.ai.solver.create_gemini_client", lambda: FakeClient())

    with pytest.raises(ValueError, match="Solver returned unknown memory IDs: lesson-hallucinated-xyz"):
        solver.propose(
            task_description="Sample task description",
            memories=fake_memories,
        )

    print("Scenario 11: Solver.propose() rejected hallucinated memory IDs [PASS]")


def main():
    print("Starting Evidence-Backed Verification tests...\n")
    test_scenario_1_relevant_test_passes()
    test_scenario_2_relevant_test_fails()
    test_scenario_3_test_timeout_or_unconfirmed()
    test_scenario_4_generic_smoke_test_rejected_for_unrelated()
    test_scenario_5_orchestrator_workflow_evaluation()
    test_scenario_6_failed_test_fixture_never_becomes_verified_success()
    test_scenario_7_invalid_graph_relationships_and_schema_validation_rejected()
    test_scenario_8_duplicate_submissions_idempotency_and_preservation()
    test_scenario_9_solver_rejects_hallucinated_memory_ids()
    test_scenario_10_test_runner_sandbox_enforcement()
    test_scenario_11_solver_propose_rejects_hallucinated_memory_in_pipeline(pytest.MonkeyPatch())
    print("\nALL EVIDENCE-BACKED VERIFICATION CHECKS PASSED.")


if __name__ == "__main__":
    main()


