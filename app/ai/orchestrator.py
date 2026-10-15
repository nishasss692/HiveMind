
from typing import Any

from app.ai.investigator import Investigator
from app.ai.solver import Solver
from app.ai.verifier import (
    TestExecutionResult,
    VerificationResult,
    Verifier,
)
from app.ai.memory_curator import MemoryCurator
from app.memory.graph_repository import GraphMemoryRepository


class HiveMindOrchestrator:
    """Coordinates HiveMind's memory, reasoning, and verification agents."""

    def __init__(
        self,
        repository: GraphMemoryRepository | None = None,
    ):
        self.repository = repository or GraphMemoryRepository()

        self.investigator = Investigator(self.repository)
        self.solver = Solver()
        self.verifier = Verifier()
        self.curator = MemoryCurator(self.repository)

    def propose_solution(
        self,
        task_description: str,
        category: str | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:
        """Retrieve relevant lessons and generate a solution proposal."""

        if not task_description.strip():
            raise ValueError("Task description cannot be empty.")

        investigation = self.investigator.investigate(
            task_description=task_description,
            category=category,
            limit=limit,
        )

        proposal = self.solver.propose(
            task_description=task_description,
            memories=investigation["memories"],
        )

        return {
            "task_description": task_description,
            "memories": investigation["memories"],
            "memory_count": investigation["memory_count"],
            "proposal": proposal,
            "verification_status": "UNVERIFIED",
        }

    def record_verification(
        self,
        task_description: str,
        problem_title: str,
        category: str,
        proposal: Any,
        test_result: TestExecutionResult,
        lesson_content: str | None = None,
    ) -> dict[str, Any]:
        """Record supplied test-runner results and persist the outcome."""

        verification: VerificationResult = self.verifier.verify(
            test_result
        )

        experience = self.curator.record_result(
            task_description=task_description,
            problem_title=problem_title,
            category=category,
            proposed_solution=proposal.proposed_fix,
            verification=verification,
            lesson_content=lesson_content,
        )

        return {
            "verification_status": verification.status,
            "verification_evidence": verification.evidence,
            "lesson_saved": experience.lesson is not None,
            "lesson_id": (
                experience.lesson.id
                if experience.lesson is not None
                else None
            ),
            "outcome_id": experience.outcome.id,
        }
