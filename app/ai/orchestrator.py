
from typing import Any
from uuid import uuid4

from app.ai.investigator import Investigator
from app.ai.solver import Solver
from app.ai.test_runner import TestRunner
from app.ai.verifier import (
    TestExecutionResult,
    TestSpecification,
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
        self.test_runner = TestRunner(timeout_seconds=60)

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

        task_id = f"task-{uuid4().hex}"
        proposal_id = f"proposal-{uuid4().hex}"
        proposal.proposal_id = proposal_id

        return {
            "task_id": task_id,
            "proposal_id": proposal_id,
            "task_description": task_description,
            "proposed_fix": proposal.proposed_fix,
            "memories": investigation["memories"],
            "memory_count": investigation["memory_count"],
            "proposal": proposal,
            "verification_status": "UNVERIFIED",
        }

    def evaluate_proposal(
        self,
        task_id: str,
        proposal_id: str,
        task_description: str,
        proposed_fix: str,
        test_file: str,
        is_relevant: bool = True,
        test_description: str = "",
    ) -> dict[str, Any]:
        """Run tests associated with a proposal, verify relevance, and return evaluation record."""
        test_spec = TestSpecification(
            proposal_id=proposal_id,
            task_id=task_id,
            test_file=test_file,
            is_relevant=is_relevant,
            description=test_description,
        )

        test_execution: TestExecutionResult = self.test_runner.run(test_file)
        verification: VerificationResult = self.verifier.verify_proposal(
            proposal_id=proposal_id,
            result=test_execution,
            test_spec=test_spec,
        )

        return {
            "task_id": task_id,
            "proposal_id": proposal_id,
            "task_description": task_description,
            "proposed_fix": proposed_fix,
            "test_specification": test_spec,
            "selected_test_file": test_file,
            "test_execution": test_execution,
            "verification": verification,
            "verification_status": verification.status,
            "evidence": verification.evidence,
        }

    def record_verification(
        self,
        task_description: str,
        problem_title: str,
        category: str,
        proposal: Any,
        test_result: TestExecutionResult,
        lesson_content: str | None = None,
        test_spec: TestSpecification | None = None,
        task_id: str | None = None,
        proposal_id: str | None = None,
    ) -> dict[str, Any]:
        """Record supplied test-runner results and persist the outcome."""
        pid = (
            proposal_id
            or getattr(proposal, "proposal_id", None)
            or (test_spec.proposal_id if test_spec else None)
            or f"proposal-{uuid4().hex}"
        )

        if test_spec is not None:
            verification: VerificationResult = self.verifier.verify_proposal(
                proposal_id=pid,
                result=test_result,
                test_spec=test_spec,
            )
        else:
            verification = self.verifier.verify(test_result)

        experience = self.curator.record_result(
            task_description=task_description,
            problem_title=problem_title,
            category=category,
            proposed_solution=(
                proposal.proposed_fix
                if hasattr(proposal, "proposed_fix")
                else str(proposal)
            ),
            verification=verification,
            lesson_content=lesson_content,
            task_id=task_id,
            attempt_id=f"attempt-{pid}",
        )

        return {
            "task_id": experience.task.id,
            "proposal_id": pid,
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

    def run_tests(
        self,
        test_file: str,
        test_spec: TestSpecification | None = None,
    ) -> dict[str, Any]:
        """Run the selected test file and verify its execution."""
        test_execution: TestExecutionResult = self.test_runner.run(test_file)
        verification: VerificationResult = self.verifier.verify(
            test_execution,
            test_spec=test_spec,
        )

        return {
            "test_execution": test_execution,
            "verification": verification,
            "verification_status": verification.status,
            "evidence": verification.evidence,
        }

