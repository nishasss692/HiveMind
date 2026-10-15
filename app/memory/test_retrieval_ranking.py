from app.memory.graph_repository import GraphMemoryRepository
from app.memory.retrieval import MemoryRetriever, calculate_similarity, tokenize


def test_empty_query_handling():
    repository = GraphMemoryRepository()
    retriever = MemoryRetriever(repository)

    assert retriever.search("") == []
    assert retriever.search("   ") == []
    print("Test 1 (Empty query handling): PASS")


def test_tokenization_and_similarity():
    # Stopwords like 'the', 'is', 'for' should be stripped
    tokens = tokenize("The quick brown fox is running for migration")
    assert "the" not in tokens
    assert "is" not in tokens
    assert "for" not in tokens
    assert "migration" in tokens

    sim_high = calculate_similarity(
        "database migration deadlock index table",
        "database migration deadlock on concurrent index build",
    )
    sim_low = calculate_similarity(
        "database migration deadlock index table",
        "unrelated css styling for navigation bar",
    )
    assert sim_high > sim_low, f"Expected {sim_high} > {sim_low}"
    print("Test 2 (Tokenization & similarity calculation): PASS")


def test_retrieval_ranking_and_deduplication():
    repository = GraphMemoryRepository()
    retriever = MemoryRetriever(repository)

    results = retriever.search(
        task_description="database migration deadlock schema change order",
        category="database_migration",
        limit=10,
    )

    if results:
        # Check deduplication: each lesson_id must be unique in results
        lesson_ids = [r["lesson_id"] for r in results]
        assert len(lesson_ids) == len(set(lesson_ids)), (
            "Found duplicate lesson_ids in retrieval results"
        )

        # Check sorting: scores must be monotonically non-increasing
        scores = [r["similarity_score"] for r in results]
        assert scores == sorted(scores, reverse=True), (
            "Results are not sorted by similarity_score descending"
        )

        # Check required fields
        for item in results:
            assert "lesson_id" in item
            assert "lesson" in item
            assert "outcome_status" in item
            assert item["outcome_status"] in ["VERIFIED_SUCCESS", "VERIFIED_FAILURE"]
            assert "evidence" in item
            assert item["category"] == "database_migration"

    print("Test 3 (Retrieval ranking & deduplication): PASS")


def main():
    print("Running Retrieval Quality & Ranking Tests...\n")
    test_empty_query_handling()
    test_tokenization_and_similarity()
    test_retrieval_ranking_and_deduplication()
    print("\nALL RETRIEVAL RANKING CHECKS PASSED.")


if __name__ == "__main__":
    main()
