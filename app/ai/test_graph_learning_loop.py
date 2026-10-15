
import subprocess
import sys

from app.ai.memory_curator import MemoryCurator
from app.ai.verifier import TestExecutionResult, Verifier
from app.memory.graph_repository import GraphMemoryRepository
from app.memory.retrieval import MemoryRetriever


def main():
    print("Step 1: Running Curator tests...")

    process = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.ai.test_memory_curator",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    print(process.stdout)

    verification = Verifier().verify(
        TestExecutionResult(
            command="python -m app.ai.test_memory_curator",
            exit_code=process.returncode,
            tests_executed=True,
            stdout=process.stdout,
            stderr=process.stderr,
        )
    )

    if verification.status != "VERIFIED_SUCCESS":
        print("Curator tests did not pass.")
        print(process.stderr)
        print("Status:", verification.status)
        raise SystemExit(1)

    print("Step 2: Saving verified test evidence to FalkorDB...")

    repository = GraphMemoryRepository()
    curator = MemoryCurator(repository)

    experience = curator.record_result(
        task_description=(
            "HiveMind integration test: verify that a lesson "
            "can be saved to and retrieved from graph memory."
        ),
        problem_title="HiveMind graph memory integration",
        category="hivemind_integration",
        proposed_solution=(
            "Persist a verified test outcome and its supporting lesson."
        ),
        verification=verification,
        lesson_content=(
            "The Memory Curator unit tests passed using controlled "
            "fixtures and a fake repository. This validates the "
            "Curator rules, but does not by itself prove graph "
            "persistence or application-level correctness."
        ),
    )

    assert experience.lesson is not None
    expected_lesson_id = experience.lesson.id

    print("Saved lesson:", expected_lesson_id)

    print("Step 3: Retrieving the new lesson from FalkorDB...")

    retriever = MemoryRetriever(repository)

    results = retriever.search(
        task_description=(
            "HiveMind integration test graph memory lesson "
            "Curator unit tests controlled fixtures"
        ),
        category="hivemind_integration",
        limit=10,
    )

    found = next(
        (
            item for item in results
            if item["lesson_id"] == expected_lesson_id
        ),
        None,
    )

    if found is None:
        raise AssertionError(
            "The newly saved lesson was not found in retrieval results. "
            "Inspect GraphMemoryRepository and MemoryRetriever."
        )

    print("Retrieved lesson:", found["lesson_id"])
    print("Outcome:", found["outcome_status"])
    print("\nREAL GRAPH SAVE-AND-RETRIEVE CHECK PASSED.")


if __name__ == "__main__":
    main()
