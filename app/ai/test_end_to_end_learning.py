from uuid import uuid4

from app.ai.agent_schemas import SolverResponse
from app.ai.orchestrator import HiveMindOrchestrator
from app.ai.verifier import TestExecutionResult, TestSpecification
from app.memory.graph_repository import GraphMemoryRepository


class MockSolver:
    """Deterministic solver mock that avoids external API calls during testing."""

    def propose(self, task_description: str, memories: list) -> SolverResponse:
        memory_ids = [
            m["lesson_id"] for m in memories
            if isinstance(m, dict) and "lesson_id" in m
        ]
        return SolverResponse(
            diagnosis=(
                "Blocking index creation locks table transactions, "
                "causing deadlocks during peak schema migration."
            ),
            proposed_fix=(
                "Create indexes concurrently using non-blocking schema statements "
                "and validate transaction completion before enforcing constraints."
            ),
            reasoning=(
                "Allows concurrent reads and writes while the database builds "
                "the index in background without holding exclusive locks."
            ),
            tests_to_run=["tests/test_migration_fixture.py"],
            memory_ids_used=memory_ids[:2],
            risks=["Slight increase in background I/O during index construction."],
        )


def main():
    print("=====================================================")
    print("HiveMind End-to-End Cross-Task Learning Loop Test")
    print("=====================================================\n")

    # Connect to the real FalkorDB graph repository.
    repository = GraphMemoryRepository()
    assert repository.ping(), "Failed to connect to FalkorDB"
    print("Database connection to FalkorDB: PASS\n")

    orchestrator = HiveMindOrchestrator(repository=repository)
    # Inject deterministic MockSolver
    orchestrator.solver = MockSolver()

    uid = uuid4().hex[:8]
    category = "database_migration"

    # -----------------------------------------------------------------
    # Check 1: An unrelated test cannot verify a proposal
    # -----------------------------------------------------------------
    print("Check 1: Testing rejection of unrelated test...")
    unrelated_eval = orchestrator.evaluate_proposal(
        task_id=f"task-unrelated-{uid}",
        proposal_id=f"proposal-unrelated-{uid}",
        task_description="Fix migration deadlock on table lock",
        proposed_fix="Create index concurrently",
        test_file="tests/test_runner_smoke.py",
        is_relevant=False,
        test_description="Generic smoke test unrelated to migration",
    )
    assert unrelated_eval["verification_status"] == "UNVERIFIED", (
        f"Expected UNVERIFIED for unrelated test, got {unrelated_eval['verification_status']}"
    )
    print("Check 1 PASS: Unrelated smoke test returned UNVERIFIED.\n")

    # -----------------------------------------------------------------
    # Check 2: An unverified result cannot create a lesson
    # -----------------------------------------------------------------
    print("Check 2: Testing that unverified outcome creates no lesson...")
    unverified_execution = TestExecutionResult(
        command="python -m pytest tests/test_migration_fixture.py -q",
        exit_code=None,
        tests_executed=False,
        test_file="tests/test_migration_fixture.py",
        stderr="Test runner timed out.",
    )
    fake_proposal = SolverResponse(
        diagnosis="Timeout diagnosis",
        proposed_fix="Timeout fix",
        reasoning="None",
        tests_to_run=[],
        memory_ids_used=[],
        risks=[],
    )
    fake_proposal.proposal_id = f"proposal-timeout-{uid}"

    unverified_record = orchestrator.record_verification(
        task_description="Timeout migration task",
        problem_title="Timeout migration problem",
        category=category,
        proposal=fake_proposal,
        test_result=unverified_execution,
        lesson_content="This lesson must not be saved.",
        task_id=f"task-timeout-{uid}",
        proposal_id=fake_proposal.proposal_id,
    )
    assert unverified_record["verification_status"] == "UNVERIFIED"
    assert unverified_record["lesson_saved"] is False
    assert unverified_record["lesson_id"] is None
    print("Check 2 PASS: Unverified result did not create a lesson.\n")

    # -----------------------------------------------------------------
    # Stage 1: First controlled task submission and proposal
    # -----------------------------------------------------------------
    print("Stage 1: Submitting Task 1...")
    task_1_desc = f"Database deadlock during index creation on active table [run-{uid}]"
    problem_1_title = f"Concurrent index migration deadlock [run-{uid}]"

    proposal_1_data = orchestrator.propose_solution(
        task_description=task_1_desc,
        category=category,
        limit=5,
    )
    task_1_id = proposal_1_data["task_id"]
    proposal_1_id = proposal_1_data["proposal_id"]
    proposal_1 = proposal_1_data["proposal"]

    print(f"Task 1 ID: {task_1_id}")
    print(f"Proposal 1 ID: {proposal_1_id}")
    print(f"Proposed Fix: {proposal_1.proposed_fix}")

    # -----------------------------------------------------------------
    # Stage 2: Run designated test fixture and verify
    # -----------------------------------------------------------------
    print("\nStage 2: Running designated relevant test fixture...")
    eval_1 = orchestrator.evaluate_proposal(
        task_id=task_1_id,
        proposal_id=proposal_1_id,
        task_description=task_1_desc,
        proposed_fix=proposal_1.proposed_fix,
        test_file="tests/test_migration_fixture.py",
        is_relevant=True,
        test_description="Validates non-blocking index migration",
    )

    assert eval_1["verification_status"] == "VERIFIED_SUCCESS", (
        f"Expected VERIFIED_SUCCESS, got {eval_1['verification_status']}"
    )
    assert eval_1["test_execution"].tests_executed is True
    print(f"Verification Status: {eval_1['verification_status']}")
    print("Relevant test fixture executed and verified: PASS\n")

    # -----------------------------------------------------------------
    # Stage 3: Record verified outcome and lesson through MemoryCurator
    # -----------------------------------------------------------------
    print("Stage 3: Persisting verified outcome and lesson to FalkorDB...")
    lesson_1_text = (
        f"When creating indexes on active tables during migration, use "
        f"non-blocking concurrent index build to prevent deadlock [run-{uid}]."
    )

    record_1 = orchestrator.record_verification(
        task_description=task_1_desc,
        problem_title=problem_1_title,
        category=category,
        proposal=proposal_1,
        test_result=eval_1["test_execution"],
        lesson_content=lesson_1_text,
        test_spec=eval_1["test_specification"],
        task_id=task_1_id,
        proposal_id=proposal_1_id,
    )

    assert record_1["lesson_saved"] is True, "Lesson was not saved"
    assert record_1["lesson_id"] is not None
    saved_lesson_id = record_1["lesson_id"]
    saved_outcome_id = record_1["outcome_id"]
    print(f"Lesson saved successfully: {saved_lesson_id}")
    print(f"Outcome ID: {saved_outcome_id}\n")

    # -----------------------------------------------------------------
    # Check 3: Repeated submission idempotency
    # -----------------------------------------------------------------
    print("Check 3: Testing repeated submission idempotency...")
    repeat_record = orchestrator.record_verification(
        task_description=task_1_desc,
        problem_title=problem_1_title,
        category=category,
        proposal=proposal_1,
        test_result=eval_1["test_execution"],
        lesson_content=lesson_1_text,
        test_spec=eval_1["test_specification"],
        task_id=task_1_id,
        proposal_id=proposal_1_id,
    )
    assert repeat_record["outcome_id"] == saved_outcome_id, (
        f"Outcome ID mismatch on repeated submission: {repeat_record['outcome_id']} != {saved_outcome_id}"
    )
    print("Check 3 PASS: Repeated submission maintains outcome identity.\n")

    # -----------------------------------------------------------------
    # Stage 4: Submit a similar second task and check memory retrieval
    # -----------------------------------------------------------------
    print("Stage 4: Submitting similar Task 2 to test cross-task learning...")
    task_2_desc = (
        f"Preventing schema lock timeout and deadlock when creating index "
        f"during migration [run-{uid}]"
    )

    investigation_2 = orchestrator.investigator.investigate(
        task_description=task_2_desc,
        category=category,
        limit=5,
    )

    retrieved_memories = investigation_2["memories"]
    print(f"Retrieved {len(retrieved_memories)} memories for Task 2.")

    matching_memory = next(
        (m for m in retrieved_memories if m["lesson_id"] == saved_lesson_id),
        None,
    )

    assert matching_memory is not None, (
        f"Lesson {saved_lesson_id} was NOT retrieved by Task 2 investigation!"
    )
    print(f"MATCH CONFIRMED: Task 2 retrieved lesson {matching_memory['lesson_id']}.")
    print(f"Retrieved Lesson Content: {matching_memory['lesson']}")
    print(f"Supporting Outcome Status: {matching_memory['outcome_status']}")
    print(f"Supporting Evidence:\n{matching_memory['evidence']}")

    assert matching_memory["outcome_status"] == "VERIFIED_SUCCESS"
    assert "tests/test_migration_fixture.py" in matching_memory["evidence"]
    assert "Exit code: 0" in matching_memory["evidence"]

    # -----------------------------------------------------------------
    # Stage 5: Task 2 proposal incorporates the learned lesson
    # -----------------------------------------------------------------
    print("\nStage 5: Generating proposal for Task 2 using retrieved memory...")
    proposal_2_data = orchestrator.propose_solution(
        task_description=task_2_desc,
        category=category,
        limit=5,
    )
    proposal_2 = proposal_2_data["proposal"]
    print(f"Task 2 Proposal ID: {proposal_2_data['proposal_id']}")
    print(f"Task 2 Memories Used: {proposal_2.memory_ids_used}")
    assert saved_lesson_id in proposal_2.memory_ids_used, (
        f"Expected {saved_lesson_id} in proposal_2.memory_ids_used, got {proposal_2.memory_ids_used}"
    )
    print("Task 2 proposal incorporated learned lesson from Task 1: PASS")

    print("\n=====================================================")
    print("ALL END-TO-END CROSS-TASK LEARNING TESTS PASSED!")
    print("=====================================================")


if __name__ == "__main__":
    main()
