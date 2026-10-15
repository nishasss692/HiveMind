"""
HiveMind — Self-Contained Demonstration: Cross-Task Graph Learning Loop

This demo illustrates HiveMind's core capability:
1. Receiving an engineering incident/task.
2. Generating a structured solution proposal with an explicit unique Proposal ID.
3. Running a controlled test fixture through the TestRunner.
4. Verifying test results with the Verifier (enforcing proposal-to-test association).
5. Persisting the verified outcome and reusable lesson into FalkorDB graph memory.
6. Submitting a similar second task and demonstrating that HiveMind retrieves the
   exact lesson and incorporates it into the second proposal.

Note:
- Uses a deterministic MockSolver to guarantee a reproducible demonstration without
  external API rate limits or network dependencies.
- Uses a controlled test fixture (`tests/test_migration_fixture.py`) to demonstrate
  test execution and verification safely.
"""

from uuid import uuid4

from app.ai.agent_schemas import SolverResponse
from app.ai.orchestrator import HiveMindOrchestrator
from app.memory.graph_repository import GraphMemoryRepository


class DemoMockSolver:
    """Deterministic solver mock for reproducible demonstration."""

    def propose(self, task_description: str, memories: list) -> SolverResponse:
        memory_ids = [
            m["lesson_id"] for m in memories
            if isinstance(m, dict) and "lesson_id" in m
        ]

        if memory_ids:
            reasoning = (
                f"Informed by previous verified experience ({memory_ids[0]}): "
                f"concurrent index builds prevent table-level exclusive locks."
            )
        else:
            reasoning = (
                "Initial hypothesis: blocking index creation causes exclusive table "
                "locks that deadlock active transactions during schema migration."
            )

        return SolverResponse(
            diagnosis="Table locks during index creation cause deadlocks on high-traffic tables.",
            proposed_fix=(
                "Create indexes concurrently using non-blocking schema statements "
                "and verify schema consistency post-migration."
            ),
            reasoning=reasoning,
            tests_to_run=["tests/test_migration_fixture.py"],
            memory_ids_used=memory_ids[:2],
            risks=["Temporary background I/O increase during non-blocking index build."],
        )


def main():
    print("=" * 70)
    print("       HIVEMIND: CROSS-TASK GRAPH LEARNING LOOP DEMONSTRATION")
    print("=" * 70)
    print("[INFO] Mode: Self-contained demonstration with controlled test fixture")
    print("[INFO] Solver: Deterministic MockSolver (avoids live API rate-limits)")
    print("[INFO] Storage: Live FalkorDB Graph Memory (hivemind)\n")

    # Connect to graph memory
    repository = GraphMemoryRepository()
    assert repository.ping(), "Could not connect to FalkorDB"
    print("[PASS] FalkorDB graph connection verified.\n")

    orchestrator = HiveMindOrchestrator(repository=repository)
    orchestrator.solver = DemoMockSolver()

    demo_id = uuid4().hex[:6]
    category = "database_migration"

    # -------------------------------------------------------------
    # STAGE 1: Task 1 Submission & Proposal Generation
    # -------------------------------------------------------------
    print("-" * 70)
    print(f"STAGE 1: Task 1 Submission [Session {demo_id}]")
    print("-" * 70)

    task_1_desc = (
        f"Database transaction deadlock when creating index on active "
        f"orders table during migration [demo-{demo_id}]"
    )
    problem_1_title = f"Index creation migration deadlock [demo-{demo_id}]"

    print(f"Task Description: {task_1_desc}")
    print(f"Category:         {category}")

    proposal_1_data = orchestrator.propose_solution(
        task_description=task_1_desc,
        category=category,
        limit=5,
    )

    task_1_id = proposal_1_data["task_id"]
    proposal_1_id = proposal_1_data["proposal_id"]
    proposal_1 = proposal_1_data["proposal"]

    print(f"\nGenerated Unique Task ID:     {task_1_id}")
    print(f"Generated Unique Proposal ID: {proposal_1_id}")
    print(f"Diagnosis:    {proposal_1.diagnosis}")
    print(f"Proposed Fix: {proposal_1.proposed_fix}")
    print(f"Reasoning:    {proposal_1.reasoning}")
    print(f"Status:       {proposal_1_data['verification_status']} (unverified proposal)")

    # -------------------------------------------------------------
    # STAGE 2: Explicit Test Specification & Execution
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("STAGE 2: Evaluating Proposal via Controlled Test Fixture")
    print("-" * 70)
    print("Notice: The Verifier accepts verification ONLY when an explicit")
    print("test specification designates the test as relevant to the proposal.")

    test_file = "tests/test_migration_fixture.py"
    print(f"\nExecuting designated test fixture: {test_file}")

    eval_result = orchestrator.evaluate_proposal(
        task_id=task_1_id,
        proposal_id=proposal_1_id,
        task_description=task_1_desc,
        proposed_fix=proposal_1.proposed_fix,
        test_file=test_file,
        is_relevant=True,
        test_description="Verify concurrent index migration eliminates deadlocks",
    )

    print(f"Test Command:        {eval_result['test_execution'].command}")
    print(f"Tests Confirmed:     {eval_result['test_execution'].tests_executed}")
    print(f"Exit Code:           {eval_result['test_execution'].exit_code}")
    print(f"Verification Status: {eval_result['verification_status']}")

    assert eval_result["verification_status"] == "VERIFIED_SUCCESS"

    # -------------------------------------------------------------
    # STAGE 3: Persisting Verified Evidence & Lesson to FalkorDB
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("STAGE 3: Persisting Verified Evidence to Graph Memory")
    print("-" * 70)

    lesson_content = (
        f"When adding an index to tables under active load during schema "
        f"migrations, execute concurrent index builds to prevent deadlock [demo-{demo_id}]."
    )

    record_result = orchestrator.record_verification(
        task_description=task_1_desc,
        problem_title=problem_1_title,
        category=category,
        proposal=proposal_1,
        test_result=eval_result["test_execution"],
        lesson_content=lesson_content,
        test_spec=eval_result["test_specification"],
        task_id=task_1_id,
        proposal_id=proposal_1_id,
    )

    saved_lesson_id = record_result["lesson_id"]
    saved_outcome_id = record_result["outcome_id"]

    print(f"Lesson Saved: {record_result['lesson_saved']}")
    print(f"Lesson ID:    {saved_lesson_id}")
    print(f"Outcome ID:   {saved_outcome_id}")
    print(f"Status:       {record_result['verification_status']}")

    # -------------------------------------------------------------
    # STAGE 4: Second Similar Task Submission (Cross-Task Learning)
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print(f"STAGE 4: Submitting Similar Task 2 [Session {demo_id}]")
    print("-" * 70)

    task_2_desc = (
        f"Table lock timeout and deadlock when creating index on customers table "
        f"during peak migration [demo-{demo_id}]"
    )
    print(f"Task 2 Description: {task_2_desc}")

    investigation_2 = orchestrator.investigator.investigate(
        task_description=task_2_desc,
        category=category,
        limit=5,
    )

    retrieved_memories = investigation_2["memories"]
    print(f"\nMemories Retrieved by Investigator: {len(retrieved_memories)}")

    matching_lesson = next(
        (m for m in retrieved_memories if m["lesson_id"] == saved_lesson_id),
        None,
    )

    assert matching_lesson is not None, "Failed to retrieve the lesson created in Stage 3!"

    print("\n[SUCCESS] Exact lesson from Task 1 was retrieved by Task 2:")
    print(f"  Lesson ID:             {matching_lesson['lesson_id']}")
    print(f"  Similarity Score:      {matching_lesson['similarity_score']}")
    print(f"  Supporting Outcome:    {matching_lesson['outcome_status']}")
    print(f"  Lesson Content:        {matching_lesson['lesson']}")

    # -------------------------------------------------------------
    # STAGE 5: Task 2 Proposal Grounded in Learned Experience
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("STAGE 5: Generating Task 2 Proposal Grounded in Memory")
    print("-" * 70)

    proposal_2_data = orchestrator.propose_solution(
        task_description=task_2_desc,
        category=category,
        limit=5,
    )
    proposal_2 = proposal_2_data["proposal"]

    print(f"Task 2 Proposal ID:    {proposal_2_data['proposal_id']}")
    print(f"Memories Used by Fix:  {proposal_2.memory_ids_used}")
    print(f"Grounding Reasoning:   {proposal_2.reasoning}")

    assert saved_lesson_id in proposal_2.memory_ids_used

    print("\n" + "=" * 70)
    print("     DEMONSTRATION COMPLETED SUCCESSFULLY: FULL LOOP VERIFIED")
    print("=" * 70)


if __name__ == "__main__":
    main()
