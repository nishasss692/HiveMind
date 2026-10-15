
from uuid import uuid4

from app.ai.verifier import VerificationResult
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


class MemoryCurator:
    """Stores verification evidence and creates evidence-backed lessons."""

    def __init__(self, repository: GraphMemoryRepository):
        self.repository = repository

    def record_result(
        self,
        task_description: str,
        problem_title: str,
        category: str,
        proposed_solution: str,
        verification: VerificationResult,
        lesson_content: str | None = None,
    ) -> ExperienceRecord:
        """Save an outcome and, when verified, its reusable lesson.

        The Verifier supplies the status and evidence.
        The Curator does not independently declare a solution successful.
        """

        if not task_description.strip():
            raise ValueError("Task description cannot be empty.")

        if not problem_title.strip():
            raise ValueError("Problem title cannot be empty.")

        if not category.strip():
            raise ValueError("Problem category cannot be empty.")

        if not verification.evidence.strip():
            raise ValueError("Verification evidence cannot be empty.")

        verified = verification.status in {
            "VERIFIED_SUCCESS",
            "VERIFIED_FAILURE",
        }

        if verified and not lesson_content:
            raise ValueError(
                "A verified outcome requires lesson_content."
            )

        if lesson_content is not None and not lesson_content.strip():
            raise ValueError("Lesson content cannot be blank.")

        task_id = f"task-{uuid4().hex}"
        problem_id = f"problem-{uuid4().hex}"
        attempt_id = f"attempt-{uuid4().hex}"
        outcome_id = f"outcome-{uuid4().hex}"

        task = TaskRecord(
            id=task_id,
            description=task_description,
        )

        problem = ProblemRecord(
            id=problem_id,
            title=problem_title,
            category=category,
            description=task_description,
        )

        attempt = AttemptRecord(
            id=attempt_id,
            description=(
                f"Verification of proposed solution: "
                f"{problem_title}"
            ),
            status=verification.status,
        )

        agent = AgentRecord(
            id="agent-verifier",
            role="VERIFIER",
        )

        solution = (
            SolutionRecord(
                id=f"solution-{uuid4().hex}",
                description=proposed_solution,
            )
            if proposed_solution.strip()
            else None
        )

        failure = None
        if verification.status == "VERIFIED_FAILURE":
            failure = FailureRecord(
                id=f"failure-{uuid4().hex}",
                description=(
                    verification.evidence
                    or "The recorded test execution failed."
                ),
                error_type="test_failure",
            )

        outcome = OutcomeRecord(
            id=outcome_id,
            status=verification.status,
            evidence=verification.evidence,
        )

        lesson = None
        if verified:
            lesson = LessonRecord(
                id=f"lesson-{uuid4().hex}",
                content=lesson_content.strip(),
                confidence=0.8,
            )

        experience = ExperienceRecord(
            task=task,
            problem=problem,
            attempt=attempt,
            agent=agent,
            solution=solution,
            failure=failure,
            outcome=outcome,
            lesson=lesson,
        )

        # Persist using the existing FalkorDB repository.
        self.repository.save_experience(experience)

        return experience
