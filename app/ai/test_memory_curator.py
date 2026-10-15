
from app.ai.memory_curator import MemoryCurator
from app.ai.verifier import (
    TestExecutionResult,
    Verifier,
)


class FakeRepository:
    def __init__(self):
        self.saved_experiences = []

    def save_experience(self, experience):
        self.saved_experiences.append(experience)


def main():
    repository = FakeRepository()
    verifier = Verifier()
    curator = MemoryCurator(repository)

    base = {
        "task_description": "Fix a database migration ordering issue.",
        "problem_title": "Migration dependency ordering",
        "category": "database_migration",
        "proposed_solution": (
            "Declare dependencies and validate migration order."
        ),
    }

    # Scenario 1: verified success creates a lesson.
    success = verifier.verify(
        TestExecutionResult(
            command="pytest tests/test_migration.py",
            exit_code=0,
            tests_executed=True,
            stdout="3 passed",
        )
    )

    saved_success = curator.record_result(
        **base,
        verification=success,
        lesson_content=(
            "For this migration scenario, the dependency "
            "ordering change passed the recorded tests."
        ),
    )

    assert saved_success.lesson is not None
    assert saved_success.outcome.status == "VERIFIED_SUCCESS"

    # Scenario 2: verified failure can also create a lesson.
    failure = verifier.verify(
        TestExecutionResult(
            command="pytest tests/test_migration.py",
            exit_code=1,
            tests_executed=True,
            stdout="1 failed",
            stderr="Migration dependency error",
        )
    )

    saved_failure = curator.record_result(
        **base,
        verification=failure,
        lesson_content=(
            "This migration approach failed under the recorded "
            "test conditions; inspect the dependency error."
        ),
    )

    assert saved_failure.lesson is not None
    assert saved_failure.failure is not None
    assert saved_failure.outcome.status == "VERIFIED_FAILURE"

    # Scenario 3: unverified results must not create lessons.
    unverified = verifier.verify(
        TestExecutionResult(
            command="pytest tests/test_migration.py",
            exit_code=None,
            tests_executed=False,
        )
    )

    saved_unverified = curator.record_result(
        **base,
        verification=unverified,
    )

    assert saved_unverified.lesson is None
    assert saved_unverified.outcome.status == "UNVERIFIED"

    # A verified result without lesson content must be rejected.
    try:
        curator.record_result(
            **base,
            verification=success,
        )
    except ValueError:
        pass
    else:
        raise AssertionError(
            "Expected verified result without lesson content to fail."
        )

    assert len(repository.saved_experiences) == 3

    print("Verified success: lesson created.")
    print("Verified failure: evidence-backed lesson created.")
    print("Unverified result: no lesson created.")
    print("Missing lesson content: correctly rejected.")
    print("\nAll Memory Curator checks passed.")


if __name__ == "__main__":
    main()
