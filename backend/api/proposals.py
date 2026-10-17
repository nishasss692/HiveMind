from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Path, status

from backend.schemas import (
    ProposalCreateRequest,
    ProposalEvaluateRequest,
    ProposalEvaluateResponse,
    ProposalPersistRequest,
    ProposalPersistResponse,
    ProposalResponse,
)
from backend.services.orchestration import (
    OrchestrationService,
    get_orchestration_service,
)

router = APIRouter(prefix="/proposals", tags=["proposals"])


@router.post(
    "",
    response_model=ProposalResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a solution proposal",
    description=(
        "Retrieves relevant historical lessons from FalkorDB and generates a "
        "structured solution proposal via Gemini. Newly created proposals are "
        "ALWAYS marked UNVERIFIED."
    ),
)
def create_proposal(
    request: ProposalCreateRequest,
    service: OrchestrationService = Depends(get_orchestration_service),
) -> dict[str, Any]:
    return service.propose(
        task_description=request.task_description,
        category=request.category,
        limit=request.limit,
    )


@router.post(
    "/{proposal_id}/evaluate",
    response_model=ProposalEvaluateResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate a proposal with an explicit test fixture",
    description=(
        "Executes a permitted test file under tests/ in a controlled sandbox, "
        "evaluates exit code and relevance, and returns an evidence-backed verification status."
    ),
)
def evaluate_proposal(
    proposal_id: str = Path(
        ...,
        min_length=3,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
        description="Unique proposal identifier",
    ),
    request: ProposalEvaluateRequest = ...,
    service: OrchestrationService = Depends(get_orchestration_service),
) -> dict[str, Any]:
    return service.evaluate(
        task_id=request.task_id,
        proposal_id=proposal_id,
        task_description=request.task_description,
        proposed_fix=request.proposed_fix,
        test_file=request.test_file,
        is_relevant=request.is_relevant,
        test_description=request.test_description,
    )


@router.post(
    "/{proposal_id}/persist",
    response_model=ProposalPersistResponse,
    status_code=status.HTTP_200_OK,
    summary="Persist verification outcome and reusable lessons",
    description=(
        "Persists the verified outcome and evidence into FalkorDB graph memory. "
        "Creates a reusable Lesson node ONLY if the status is VERIFIED_SUCCESS or "
        "VERIFIED_FAILURE with valid lesson_content. Unverified outcomes never save lessons."
    ),
)
def persist_proposal(
    proposal_id: str = Path(
        ...,
        min_length=3,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
        description="Unique proposal identifier",
    ),
    request: ProposalPersistRequest = ...,
    service: OrchestrationService = Depends(get_orchestration_service),
) -> dict[str, Any]:
    return service.persist(
        task_id=request.task_id,
        proposal_id=proposal_id,
        task_description=request.task_description,
        problem_title=request.problem_title,
        category=request.category,
        lesson_content=request.lesson_content,
        proposed_fix=request.proposed_fix,
    )


@router.get(
    "/{proposal_id}",
    summary="Get cached proposal details",
    description="Retrieve cached details for a generated proposal by ID.",
)
def get_proposal_details(
    proposal_id: str = Path(
        ...,
        min_length=3,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
        description="Unique proposal identifier",
    ),
    service: OrchestrationService = Depends(get_orchestration_service),
) -> dict[str, Any]:
    proposal = service.get_proposal(proposal_id)
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal '{proposal_id}' not found.",
        )
    return proposal


@router.get(
    "/{proposal_id}/evaluation",
    response_model=ProposalEvaluateResponse,
    summary="Get cached proposal evaluation",
    description="Retrieve cached evaluation and test execution results for a proposal by ID.",
)
def get_proposal_evaluation(
    proposal_id: str = Path(
        ...,
        min_length=3,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
        description="Unique proposal identifier",
    ),
    service: OrchestrationService = Depends(get_orchestration_service),
) -> dict[str, Any]:
    evaluation = service.get_evaluation(proposal_id)
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation for proposal '{proposal_id}' not found.",
        )

    test_exec = evaluation.get("test_execution")
    if hasattr(test_exec, "tests_executed"):
        tests_executed = test_exec.tests_executed
        exit_code = test_exec.exit_code
        stdout = test_exec.stdout
        stderr = test_exec.stderr
    elif isinstance(test_exec, dict):
        tests_executed = test_exec.get("tests_executed", False)
        exit_code = test_exec.get("exit_code")
        stdout = test_exec.get("stdout", "")
        stderr = test_exec.get("stderr", "")
    else:
        tests_executed = evaluation.get("tests_executed", False)
        exit_code = evaluation.get("exit_code")
        stdout = evaluation.get("stdout", "")
        stderr = evaluation.get("stderr", "")

    return {
        "task_id": evaluation["task_id"],
        "proposal_id": evaluation["proposal_id"],
        "verification_status": evaluation["verification_status"],
        "tests_executed": tests_executed,
        "exit_code": exit_code,
        "evidence": evaluation["evidence"],
        "selected_test_file": evaluation.get("selected_test_file", ""),
        "stdout": stdout,
        "stderr": stderr,
    }


@router.get(
    "/{proposal_id}/persisted",
    summary="Get cached proposal persistence record",
    description="Retrieve cached persistence record for a proposal by ID.",
)
def get_proposal_persisted(
    proposal_id: str = Path(
        ...,
        min_length=3,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
        description="Unique proposal identifier",
    ),
    service: OrchestrationService = Depends(get_orchestration_service),
) -> dict[str, Any]:
    persisted = service.get_persisted(proposal_id)
    if not persisted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persisted record for proposal '{proposal_id}' not found.",
        )
    return persisted
