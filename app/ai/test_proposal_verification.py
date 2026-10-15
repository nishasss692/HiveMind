from app.ai.orchestrator import HiveMindOrchestrator
from app.ai.verifier import (
    TestExecutionResult,
    TestSpecification,
    Verifier,
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


def main():
    print("Starting Evidence-Backed Verification tests...\n")
    test_scenario_1_relevant_test_passes()
    test_scenario_2_relevant_test_fails()
    test_scenario_3_test_timeout_or_unconfirmed()
    test_scenario_4_generic_smoke_test_rejected_for_unrelated()
    test_scenario_5_orchestrator_workflow_evaluation()
    print("\nALL EVIDENCE-BACKED VERIFICATION CHECKS PASSED.")


if __name__ == "__main__":
    main()
