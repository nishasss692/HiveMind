
import re
from typing import Any

from app.memory.graph_repository import GraphMemoryRepository


STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "to", "of",
    "in", "on", "for", "and", "or", "it", "my", "this", "that",
    "because", "with", "when", "i", "me", "we", "our", "be",
    "by", "as", "at", "from", "before", "after", "do", "does",
    "not", "can", "could", "should", "will", "have", "has",
}


def tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9_]+", text.lower())
    return {
        word for word in words
        if len(word) > 2 and word not in STOPWORDS
    }


def calculate_similarity(
    query_text: str,
    candidate_text: str,
) -> float:
    query_words = tokenize(query_text)
    candidate_words = tokenize(candidate_text)

    if not query_words or not candidate_words:
        return 0.0

    return len(query_words & candidate_words) / len(
        query_words | candidate_words
    )


class MemoryRetriever:
    def __init__(self, repository: GraphMemoryRepository):
        self.repository = repository

    def search(
        self,
        task_description: str,
        category: str | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        if not task_description or not task_description.strip():
            return []

        if not 1 <= limit <= 10:
            raise ValueError("limit must be between 1 and 10")

        result = self.repository.graph.query("""
            MATCH (l:Lesson)-[:APPLIES_TO]->(p:Problem)
            MATCH (l)-[:SUPPORTED_BY]->(o:Outcome)
            WHERE o.status IN [
                'VERIFIED_SUCCESS', 'VERIFIED_FAILURE'
            ]
            OPTIONAL MATCH (a:Attempt)-[:PRODUCED_OUTCOME]->(o)
            OPTIONAL MATCH (a)-[:PRODUCED_FAILURE]->(f:Failure)
            RETURN DISTINCT
                l.id, l.content, l.confidence,
                p.id, p.title, p.description, p.category,
                o.id, o.status, o.evidence,
                a.id, a.description,
                f.description, f.error_type
        """)

        candidates = []

        for row in result.result_set:
            (
                lesson_id, content, confidence,
                problem_id, title, description, problem_category,
                outcome_id, outcome_status, evidence,
                attempt_id, attempt_description,
                failure_description, error_type,
            ) = row

            if category and problem_category != category:
                continue

            candidate_text = " ".join(
                str(value or "")
                for value in (
                    title, description, content, attempt_description,
                    failure_description, error_type,
                )
            )

            similarity = calculate_similarity(
                task_description, candidate_text
            )

            category_bonus = (
                0.15
                if category and problem_category == category
                else 0.0
            )

            score = min(
                1.0,
                similarity + category_bonus
                + 0.05 * float(confidence or 0.0),
            )

            candidates.append({
                "lesson_id": lesson_id,
                "lesson": content,
                "problem_id": problem_id,
                "problem_title": title,
                "category": problem_category,
                "attempt_id": attempt_id,
                "outcome_id": outcome_id,
                "outcome_status": outcome_status,
                "evidence": evidence,
                "failure_description": failure_description,
                "similarity_score": round(score, 4),
            })

        # Deduplicate candidates by lesson_id, keeping the highest similarity score
        best_by_lesson: dict[str, dict[str, Any]] = {}
        for candidate in candidates:
            lid = candidate["lesson_id"]
            if lid not in best_by_lesson or candidate["similarity_score"] > best_by_lesson[lid]["similarity_score"]:
                best_by_lesson[lid] = candidate

        unique_candidates = list(best_by_lesson.values())
        unique_candidates.sort(
            key=lambda item: item["similarity_score"],
            reverse=True,
        )

        return unique_candidates[:limit]

