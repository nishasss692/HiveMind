
from typing import Any

from falkordb import FalkorDB

from app.memory.schema import ExperienceRecord


class GraphMemoryRepository:
    """Persist and retrieve HiveMind's shared graph memory."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        graph_name: str = "hivemind",
        password: str | None = None,
        username: str | None = None,
        ssl: bool = False,
    ) -> None:
        kwargs: dict[str, Any] = {"host": host, "port": port}
        if password:
            kwargs["password"] = password
        if username:
            kwargs["username"] = username
        if ssl:
            kwargs["ssl"] = True
        self.client = FalkorDB(**kwargs)
        self.graph = self.client.select_graph(graph_name)

    def ping(self) -> bool:
        """Confirm that the graph can execute a query."""
        self.graph.query("RETURN 1")
        return True

    def save_experience(self, experience: ExperienceRecord) -> None:
        """Save an attempt and its related evidence without deleting history."""
        if not isinstance(experience, ExperienceRecord):
            raise TypeError("Expected an instance of ExperienceRecord")

        if experience.lesson is not None:
            if experience.outcome is None:
                raise ValueError("Cannot save a lesson without a supporting outcome")
            if experience.outcome.status == "UNVERIFIED":
                raise ValueError("Cannot save a lesson from an unverified outcome")

        data = experience

        # Task and problem.
        self.graph.query(
            """
            MERGE (t:Task {id: $id})
            SET t.description = $description,
                t.created_at = $created_at
            """,
            {
                "id": data.task.id,
                "description": data.task.description,
                "created_at": data.task.created_at,
            },
        )

        self.graph.query(
            """
            MERGE (p:Problem {id: $id})
            SET p.title = $title,
                p.category = $category,
                p.description = $description
            """,
            {
                "id": data.problem.id,
                "title": data.problem.title,
                "category": data.problem.category,
                "description": data.problem.description,
            },
        )

        self.graph.query(
            """
            MATCH (t:Task {id: $task_id})
            MATCH (p:Problem {id: $problem_id})
            MERGE (t)-[:HAS_PROBLEM]->(p)
            """,
            {
                "task_id": data.task.id,
                "problem_id": data.problem.id,
            },
        )

        # Agent and attempt.
        self.graph.query(
            """
            MERGE (ag:Agent {id: $id})
            SET ag.role = $role
            """,
            {
                "id": data.agent.id,
                "role": data.agent.role,
            },
        )

        self.graph.query(
            """
            MERGE (a:Attempt {id: $id})
            SET a.description = $description,
                a.status = $status,
                a.created_at = $created_at
            """,
            {
                "id": data.attempt.id,
                "description": data.attempt.description,
                "status": data.attempt.status,
                "created_at": data.attempt.created_at,
            },
        )

        self.graph.query(
            """
            MATCH (p:Problem {id: $problem_id})
            MATCH (a:Attempt {id: $attempt_id})
            MATCH (ag:Agent {id: $agent_id})
            MERGE (p)-[:HAS_ATTEMPT]->(a)
            MERGE (ag)-[:PERFORMED]->(a)
            """,
            {
                "problem_id": data.problem.id,
                "attempt_id": data.attempt.id,
                "agent_id": data.agent.id,
            },
        )

        # Optional proposed solution.
        if data.solution is not None:
            s = data.solution

            self.graph.query(
                """
                MERGE (s:Solution {id: $id})
                SET s.description = $description
                """,
                {"id": s.id, "description": s.description},
            )

            self.graph.query(
                """
                MATCH (a:Attempt {id: $attempt_id})
                MATCH (s:Solution {id: $solution_id})
                MERGE (a)-[:USED_SOLUTION]->(s)
                """,
                {
                    "attempt_id": data.attempt.id,
                    "solution_id": s.id,
                },
            )

        # Optional observed failure.
        if data.failure is not None:
            f = data.failure

            self.graph.query(
                """
                MERGE (f:Failure {id: $id})
                SET f.description = $description,
                    f.error_type = $error_type
                """,
                {
                    "id": f.id,
                    "description": f.description,
                    "error_type": f.error_type,
                },
            )

            self.graph.query(
                """
                MATCH (a:Attempt {id: $attempt_id})
                MATCH (f:Failure {id: $failure_id})
                MERGE (a)-[:PRODUCED_FAILURE]->(f)
                """,
                {
                    "attempt_id": data.attempt.id,
                    "failure_id": f.id,
                },
            )

        # Optional verification result.
        if data.outcome is not None:
            o = data.outcome

            self.graph.query(
                """
                MERGE (o:Outcome {id: $id})
                SET o.status = $status,
                    o.evidence = $evidence,
                    o.verified_at = $verified_at
                """,
                {
                    "id": o.id,
                    "status": o.status,
                    "evidence": o.evidence,
                    "verified_at": o.verified_at,
                },
            )

            self.graph.query(
                """
                MATCH (a:Attempt {id: $attempt_id})
                MATCH (o:Outcome {id: $outcome_id})
                MERGE (a)-[:PRODUCED_OUTCOME]->(o)
                """,
                {
                    "attempt_id": data.attempt.id,
                    "outcome_id": o.id,
                },
            )

        # A lesson is allowed only when schema.py validation passes.
        if data.lesson is not None:
            lesson = data.lesson

            self.graph.query(
                """
                MERGE (l:Lesson {id: $id})
                SET l.content = $content,
                    l.confidence = $confidence,
                    l.created_at = $created_at
                """,
                {
                    "id": lesson.id,
                    "content": lesson.content,
                    "confidence": lesson.confidence,
                    "created_at": lesson.created_at,
                },
            )

            self.graph.query(
                """
                MATCH (l:Lesson {id: $lesson_id})
                MATCH (p:Problem {id: $problem_id})
                MATCH (o:Outcome {id: $outcome_id})
                MERGE (l)-[:APPLIES_TO]->(p)
                MERGE (l)-[:SUPPORTED_BY]->(o)
                """,
                {
                    "lesson_id": lesson.id,
                    "problem_id": data.problem.id,
                    "outcome_id": data.outcome.id,
                },
            )

    def get_problem_history(self, problem_id: str) -> list[dict[str, Any]]:
        """Return attempts, failures and outcomes for a problem."""
        result = self.graph.query(
            """
            MATCH (p:Problem {id: $problem_id})
                  -[:HAS_ATTEMPT]->(a:Attempt)
            OPTIONAL MATCH (a)-[:PRODUCED_FAILURE]->(f:Failure)
            OPTIONAL MATCH (a)-[:PRODUCED_OUTCOME]->(o:Outcome)
            RETURN p.id, p.title,
                   a.id, a.description, a.status,
                   f.id, f.description, f.error_type,
                   o.id, o.status, o.evidence
            ORDER BY a.created_at
            """,
            {"problem_id": problem_id},
        )

        return [
            {
                "problem_id": row[0],
                "problem_title": row[1],
                "attempt_id": row[2],
                "attempt_description": row[3],
                "attempt_status": row[4],
                "failure_id": row[5],
                "failure_description": row[6],
                "error_type": row[7],
                "outcome_id": row[8],
                "outcome_status": row[9],
                "evidence": row[10],
            }
            for row in result.result_set
        ]

    def retrieve_lessons(
        self,
        category: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Retrieve lessons backed by verified outcomes."""
        if not category or not category.strip():
            return []

        if not 1 <= limit <= 20:
            raise ValueError("limit must be between 1 and 20")

        result = self.graph.query(
            f"""
            MATCH (l:Lesson)-[:APPLIES_TO]->(p:Problem)
            MATCH (l)-[:SUPPORTED_BY]->(o:Outcome)
            WHERE p.category = $category
              AND o.status IN ['VERIFIED_SUCCESS', 'VERIFIED_FAILURE']
            OPTIONAL MATCH (a:Attempt)-[:PRODUCED_OUTCOME]->(o)
            RETURN DISTINCT
                l.id, l.content, l.confidence,
                p.id, p.title, o.id, o.status, o.evidence, a.id
            ORDER BY l.confidence DESC
            LIMIT {limit}
            """,
            {"category": category},
        )

        return [
            {
                "lesson_id": row[0],
                "content": row[1],
                "confidence": row[2],
                "problem_id": row[3],
                "problem_title": row[4],
                "supporting_outcome_id": row[5],
                "outcome_status": row[6],
                "evidence": row[7],
                "supporting_attempt_id": row[8],
            }
            for row in result.result_set
        ]
