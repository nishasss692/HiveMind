import logging
from typing import Any

from app.ai.orchestrator import HiveMindOrchestrator
from app.memory.graph_repository import GraphMemoryRepository
from backend.config import get_settings

logger = logging.getLogger(__name__)


class OrchestrationService:
    """Service wrapping HiveMindOrchestrator and maintaining in-memory evaluation records."""

    def __init__(
        self,
        orchestrator: HiveMindOrchestrator | None = None,
        repository: GraphMemoryRepository | None = None,
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

        self._proposals: dict[str, dict[str, Any]] = {}
        self._evaluations: dict[str, dict[str, Any]] = {}

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
        self._proposals[proposal_id] = result

        proposal_obj = result.get("proposal")
        return {
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
        """Evaluate a proposal using an explicit test file."""
        eval_result = self.orchestrator.evaluate_proposal(
            task_id=task_id,
            proposal_id=proposal_id,
            task_description=task_description,
            proposed_fix=proposed_fix,
            test_file=test_file,
            is_relevant=is_relevant,
            test_description=test_description,
        )

        # Store evaluation result for subsequent persistence
        self._evaluations[proposal_id] = eval_result

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
        """Persist verification evidence and lessons into FalkorDB graph memory."""
        eval_result = self._evaluations.get(proposal_id)
        if eval_result is None:
            raise ValueError(
                f"Proposal '{proposal_id}' has not been evaluated yet. "
                f"Proposals must undergo test evaluation before verification can be persisted."
            )

        fix = proposed_fix or eval_result.get("proposed_fix")
        test_execution = eval_result["test_execution"]
        test_spec = eval_result.get("test_specification")

        record = self.orchestrator.record_verification(
            task_description=task_description,
            problem_title=problem_title,
            category=category,
            proposal=fix,
            test_result=test_execution,
            lesson_content=lesson_content,
            test_spec=test_spec,
            task_id=task_id,
            proposal_id=proposal_id,
        )

        return {
            "task_id": record["task_id"],
            "proposal_id": record["proposal_id"],
            "verification_status": record["verification_status"],
            "lesson_saved": record["lesson_saved"],
            "lesson_id": record.get("lesson_id"),
            "outcome_id": record["outcome_id"],
            "verification_evidence": record.get("verification_evidence"),
        }

    def get_evaluation(self, proposal_id: str) -> dict[str, Any] | None:
        return self._evaluations.get(proposal_id)

    def get_proposal(self, proposal_id: str) -> dict[str, Any] | None:
        return self._proposals.get(proposal_id)

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
