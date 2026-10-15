
from app.memory.graph_repository import GraphMemoryRepository
# pyrefly: ignore [missing-import]
from app.memory.retrieval import MemoryRetriever


def main() -> None:
    repository = GraphMemoryRepository()
    retriever = MemoryRetriever(repository)

    memories = retriever.search(
        task_description=(
            "My database upgrade breaks because a schema "
            "change runs in the wrong order"
        ),
        category="database_migration",
        limit=5,
    )

    print("\nRetrieved memories")
    print("==================")

    for memory in memories:
        print(f"Lesson: {memory['lesson']}")
        print(f"Problem: {memory['problem_title']}")
        print(f"Outcome: {memory['outcome_status']}")
        print(f"Evidence: {memory['evidence']}")
        print(f"Score: {memory['similarity_score']}")
        print()

    assert memories, "Expected a relevant lesson to be retrieved"

    assert any(
        item["lesson_id"] == "lesson-step2-001"
        for item in memories
    ), "Expected the previously saved lesson"

    print("PASS: Similar-problem memory retrieval works.")


if __name__ == "__main__":
    main()
