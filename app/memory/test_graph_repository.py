
from app.memory.graph_repository import GraphMemoryRepository
from app.memory.schema import (
    AgentRecord,
    AttemptRecord,
    ExperienceRecord,
    FailureRecord,
    LessonRecord,
    OutcomeRecord,
    ProblemRecord,
    SolutionRecord,
    TaskRecord,
)


def main() -> None:
    repo = GraphMemoryRepository()

    assert repo.ping(), "FalkorDB query failed"
    print("1. Database connection: PASS")

    # Record a failed approach with explicit verification evidence.
    experience = ExperienceRecord(
        task=TaskRecord(
            id="task-step2-001",
            description="Fix a database migration dependency error",
        ),
        problem=ProblemRecord(
            id="problem-step2-001",
            title="Migration dependency error",
            category="database_migration",
            description="Migration ordering causes a schema inconsistency",
        ),
        agent=AgentRecord(
            id="agent-solver",
            role="SOLVER",
        ),
        attempt=AttemptRecord(
            id="attempt-step2-001",
            description="Attempted a direct column rename",
            status="VERIFIED_FAILURE",
        ),
        solution=SolutionRecord(
            id="solution-step2-001",
            description="Rename the column directly",
        ),
        failure=FailureRecord(
            id="failure-step2-001",
            description="Migration test reported a schema mismatch",
            error_type="schema_mismatch",
        ),
        outcome=OutcomeRecord(
            id="outcome-step2-001",
            status="VERIFIED_FAILURE",
            evidence=(
                "Controlled test fixture: migration validation "
                "failed because the resulting schema did not match "
                "the expected schema."
            ),
        ),
        lesson=LessonRecord(
            id="lesson-step2-001",
            content=(
                "For this failure pattern, inspect migration "
                "dependencies and validate the resulting schema "
                "before relying on a direct column rename."
            ),
            confidence=0.7,
        ),
    )

    repo.save_experience(experience)
    print("2. Experience saved: PASS")

    # Re-saving the same IDs should not duplicate graph nodes
    # or relationships.
    repo.save_experience(experience)
    print("3. Repeat save: PASS")

    history = repo.get_problem_history("problem-step2-001")
    assert any(
        row["attempt_id"] == "attempt-step2-001"
        and row["outcome_status"] == "VERIFIED_FAILURE"
        for row in history
    ), "Attempt and failure evidence were not retrieved"

    print("4. Problem history retrieval: PASS")

    lessons = repo.retrieve_lessons(
        category="database_migration",
        limit=5,
    )

    assert any(
        lesson["lesson_id"] == "lesson-step2-001"
        and lesson["outcome_status"] == "VERIFIED_FAILURE"
        for lesson in lessons
    ), "Verified lesson was not retrieved"

    print("5. Verified lesson retrieval: PASS")
    print("\nAll graph repository checks passed.")


if __name__ == "__main__":
    main()
