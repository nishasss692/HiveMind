import logging
from typing import Any

from app.ai.orchestrator import HiveMindOrchestrator
from app.memory.graph_repository import GraphMemoryRepository
from backend.config import get_settings
from backend.services.lifecycle_store import LifecycleStore

logger = logging.getLogger(__name__)


class OrchestrationService:
    """Service wrapping HiveMindOrchestrator and maintaining persisted lifecycle records."""

    def __init__(
        self,
        orchestrator: HiveMindOrchestrator | None = None,
        repository: GraphMemoryRepository | None = None,
        lifecycle_store: LifecycleStore | None = None,
    ):
        settings = get_settings()
        if orchestrator is not None:
            self.orchestrator = orchestrator
            self.repository = getattr(orchestrator, "repository", None) or repository
        else:
            self.repository = repository or GraphMemoryRepository(
                host=settings.falkordb_host,
                port=settings.falkordb_port,
                graph_name=settings.falkordb_graph_name,
            )
            self.orchestrator = HiveMindOrchestrator(repository=self.repository)

        self.store = lifecycle_store or LifecycleStore(settings.lifecycle_db_path)

    def propose(
        self,
        task_description: str,
        category: str | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:
        """Propose a solution grounded in verified graph memory."""
        result = self.orchestrator.propose_solution(
            task_description=task_description,
            category=category,
            limit=limit,
        )

        proposal_id = result["proposal_id"]
        proposal_obj = result.get("proposal")

        formatted_proposal = {
            "task_id": result["task_id"],
            "proposal_id": proposal_id,
            "status": result.get("verification_status", "UNVERIFIED"),
            "verification_status": result.get("verification_status", "UNVERIFIED"),
            "task_description": result["task_description"],
            "diagnosis": getattr(proposal_obj, "diagnosis", ""),
            "proposed_fix": result["proposed_fix"],
            "reasoning": getattr(proposal_obj, "reasoning", ""),
            "tests_to_run": getattr(proposal_obj, "tests_to_run", []),
            "memory_ids_used": getattr(proposal_obj, "memory_ids_used", []),
            "retrieved_memories_count": result.get("memory_count", 0),
            "risks": getattr(proposal_obj, "risks", []),
            "memories": result.get("memories", []),
            "proposal": proposal_obj,
        }

        self.store.save_proposal(
            proposal_id=proposal_id,
            task_id=result["task_id"],
            task_description=result["task_description"],
            proposed_fix=result["proposed_fix"],
            data=formatted_proposal,
        )

        return formatted_proposal

    def evaluate(
        self,
        task_id: str,
        proposal_id: str,
        task_description: str,
        proposed_fix: str,
        test_file: str,
        is_relevant: bool = True,
        test_description: str = "",
    ) -> dict[str, Any]:
        """Evaluate a proposal using an explicit test file with strict canonical validation."""
        # Objective 1: Validate that evaluation references a real canonical proposal
        canonical = self.store.get_proposal(proposal_id)
        if canonical is None:
            raise ValueError(f"Proposal '{proposal_id}' not found.")

        # Objective 1 & 4: Validate task ID consistency
        if task_id != canonical["task_id"]:
            raise ValueError(
                f"Task ID mismatch: provided '{task_id}' does not match canonical proposal task ID '{canonical['task_id']}'."
            )

        # Objective 2: Prevent client-supplied values from replacing canonical server-side values
        if task_description != canonical["task_description"]:
            raise ValueError(
                "Task description does not match canonical proposal task description."
            )

        if proposed_fix != canonical["proposed_fix"]:
            raise ValueError("Proposed fix does not match canonical proposal fix.")

        # Objective 6: Idempotency check for repeated evaluation
        existing_eval = self.store.get_evaluation(proposal_id)
        if existing_eval is not None:
            existing_params = self.store.get_evaluation_params(proposal_id)
            if existing_params and (
                existing_params.get("task_id") == task_id
                and existing_params.get("test_file") == test_file
                and existing_params.get("is_relevant") == is_relevant
                and existing_params.get("test_description") == test_description
                and existing_params.get("proposed_fix") == proposed_fix
                and existing_params.get("task_description") == task_description
            ):
                test_exec = existing_eval["test_execution"]
                return {
                    "task_id": existing_eval["task_id"],
                    "proposal_id": existing_eval["proposal_id"],
                    "verification_status": existing_eval["verification_status"],
                    "tests_executed": test_exec.tests_executed,
                    "exit_code": test_exec.exit_code,
                    "evidence": existing_eval["evidence"],
                    "selected_test_file": existing_eval["selected_test_file"],
                    "stdout": test_exec.stdout,
                    "stderr": test_exec.stderr,
                }
            else:
                raise ValueError(
                    f"Conflicting evaluation request: proposal '{proposal_id}' has already been evaluated with different parameters."
                )

        eval_result = self.orchestrator.evaluate_proposal(
            task_id=canonical["task_id"],
            proposal_id=proposal_id,
            task_description=canonical["task_description"],
            proposed_fix=canonical["proposed_fix"],
            test_file=test_file,
            is_relevant=is_relevant,
            test_description=test_description,
        )

        self.store.save_evaluation(
            proposal_id=proposal_id,
            task_id=canonical["task_id"],
            task_description=canonical["task_description"],
            proposed_fix=canonical["proposed_fix"],
            test_file=test_file,
            is_relevant=is_relevant,
            test_description=test_description,
            verification_status=eval_result["verification_status"],
            data=eval_result,
        )

        test_exec = eval_result["test_execution"]
        return {
            "task_id": eval_result["task_id"],
            "proposal_id": eval_result["proposal_id"],
            "verification_status": eval_result["verification_status"],
            "tests_executed": test_exec.tests_executed,
            "exit_code": test_exec.exit_code,
            "evidence": eval_result["evidence"],
            "selected_test_file": eval_result["selected_test_file"],
            "stdout": test_exec.stdout,
            "stderr": test_exec.stderr,
        }

    def persist(
        self,
        task_id: str,
        proposal_id: str,
        task_description: str,
        problem_title: str,
        category: str,
        lesson_content: str | None = None,
        proposed_fix: str | None = None,
    ) -> dict[str, Any]:
        """Persist verification evidence and lessons into FalkorDB graph memory with strict validation."""
        # Objective 1: Validate proposal exists
        canonical = self.store.get_proposal(proposal_id)
        if canonical is None:
            raise ValueError(f"Proposal '{proposal_id}' not found.")

        # Validate proposal was evaluated
        eval_result = self.store.get_evaluation(proposal_id)
        if eval_result is None:
            raise ValueError(
                f"Proposal '{proposal_id}' has not been evaluated yet. "
                f"Proposals must undergo test evaluation before verification can be persisted."
            )

        # Objective 1 & 4: Validate task ID consistency
        if task_id != canonical["task_id"] or task_id != eval_result["task_id"]:
            raise ValueError(
                f"Task ID mismatch: provided '{task_id}' does not match canonical proposal task ID '{canonical['task_id']}'."
            )

        # Objective 2: Prevent client-supplied task description from replacing canonical value
        if task_description != canonical["task_description"]:
            raise ValueError(
                "Task description does not match canonical proposal task description."
            )

        # Objective 3: Prevent persistence from associating a different proposed fix with test evidence
        if proposed_fix is not None and proposed_fix != canonical["proposed_fix"]:
            raise ValueError(
                "Proposed fix in persistence request does not match the evaluated proposal fix."
            )

        # Objective 6: Idempotency check with conflict detection
        existing_persisted = self.store.get_persisted(proposal_id)
        if existing_persisted is not None:
            existing_params = self.store.get_persisted_params(proposal_id)
            if existing_params and (
                existing_params.get("task_id") == task_id
                and existing_params.get("task_description") == task_description
                and existing_params.get("problem_title") == problem_title
                and existing_params.get("category") == category
                and existing_params.get("lesson_content") == lesson_content
                and (
                    proposed_fix is None
                    or existing_params.get("proposed_fix") == proposed_fix
                )
            ):
                return existing_persisted
            else:
                raise ValueError(
                    f"Conflicting persistence request: proposal '{proposal_id}' has already been persisted with different parameters."
                )

        fix = canonical["proposed_fix"]
        test_execution = eval_result["test_execution"]
        test_spec = eval_result.get("test_specification")

        record = self.orchestrator.record_verification(
            task_description=canonical["task_description"],
            problem_title=problem_title,
            category=category,
            proposal=fix,
            test_result=test_execution,
            lesson_content=lesson_content,
            test_spec=test_spec,
            task_id=canonical["task_id"],
            proposal_id=proposal_id,
        )

        persisted_data = {
            "task_id": record["task_id"],
            "proposal_id": record["proposal_id"],
            "verification_status": record["verification_status"],
            "lesson_saved": record["lesson_saved"],
            "lesson_id": record.get("lesson_id"),
            "outcome_id": record["outcome_id"],
            "verification_evidence": record.get("verification_evidence"),
        }

        self.store.save_persisted(
            proposal_id=proposal_id,
            task_id=canonical["task_id"],
            task_description=canonical["task_description"],
            problem_title=problem_title,
            category=category,
            lesson_content=lesson_content,
            proposed_fix=fix,
            verification_status=record["verification_status"],
            data=persisted_data,
        )

        return persisted_data

    def get_evaluation(self, proposal_id: str) -> dict[str, Any] | None:
        return self.store.get_evaluation(proposal_id)

    def get_proposal(self, proposal_id: str) -> dict[str, Any] | None:
        return self.store.get_proposal(proposal_id)

    def get_persisted(self, proposal_id: str) -> dict[str, Any] | None:
        return self.store.get_persisted(proposal_id)

    def check_health(self) -> dict[str, Any]:
        """Ping FalkorDB to determine database readiness."""
        db_ok = False
        try:
            if self.repository is not None:
                db_ok = self.repository.ping()
        except Exception as exc:
            logger.warning(f"FalkorDB health check failed: {exc}")
            db_ok = False

        return {
            "database_connected": db_ok,
            "status": "healthy" if db_ok else "degraded",
        }


_service_instance: OrchestrationService | None = None


def get_orchestration_service() -> OrchestrationService:
    """Dependency provider returning singleton OrchestrationService."""
    global _service_instance
    if _service_instance is None:
        _service_instance = OrchestrationService()
    return _service_instance
