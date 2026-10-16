from typing import Any
from pydantic import BaseModel, Field, field_validator
from app.ai.agent_schemas import SolverResponse


class ProposalCreateRequest(BaseModel):
    task_description: str = Field(
        ...,
        min_length=1,
        description="Description of the engineering issue or task.",
        examples=[
            "Database transaction deadlock when creating index on active orders table during migration"
        ],
    )
    category: str | None = Field(
        default=None,
        description="Domain category filter (e.g. database_migration, caching).",
        examples=["database_migration"],
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Maximum historical lessons to retrieve (between 1 and 10).",
    )

    @field_validator("task_description")
    @classmethod
    def validate_task_description(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Task description cannot be empty.")
        return stripped


class ProposalResponse(BaseModel):
    task_id: str = Field(description="Unique task identifier.")
    proposal_id: str = Field(description="Unique proposal identifier.")
    status: str = Field(
        default="UNVERIFIED",
        description="Verification status. Newly generated proposals are always UNVERIFIED.",
    )
    verification_status: str = Field(
        default="UNVERIFIED",
        description="Alias for status matching orchestrator output.",
    )
    task_description: str = Field(description="The input task description.")
    diagnosis: str = Field(description="Analysis of the root cause.")
    proposed_fix: str = Field(description="Concrete proposed fix approach.")
    reasoning: str = Field(description="Explanation of why this fix is appropriate.")
    tests_to_run: list[str] = Field(
        default_factory=list,
        description="Suggested test verification fixtures.",
    )
    memory_ids_used: list[str] = Field(
        default_factory=list,
        description="IDs of retrieved historical lessons used in reasoning.",
    )
    retrieved_memories_count: int = Field(
        default=0,
        description="Number of historical lessons retrieved from FalkorDB.",
    )
    risks: list[str] = Field(
        default_factory=list,
        description="Potential uncertainties or risks.",
    )
    memories: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Full list of retrieved lesson objects.",
    )
    proposal: SolverResponse | None = Field(
        default=None,
        description="Underlying structured SolverResponse model.",
    )


class ProposalEvaluateRequest(BaseModel):
    task_id: str = Field(
        ...,
        min_length=3,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
        description="Task ID associated with the proposal.",
    )
    task_description: str = Field(
        ...,
        min_length=1,
        description="The task description.",
    )
    proposed_fix: str = Field(
        ...,
        min_length=1,
        description="The proposed fix to evaluate.",
    )
    test_file: str = Field(
        ...,
        min_length=1,
        description="Relative path to test file under tests/ directory.",
        examples=["tests/test_migration_fixture.py"],
    )
    is_relevant: bool = Field(
        default=True,
        description="Whether this test is genuinely relevant to the proposal.",
    )
    test_description: str = Field(
        default="",
        description="Optional descriptive context for the test.",
    )

    @field_validator("task_id", "task_description", "proposed_fix", "test_file")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty.")
        return stripped


class ProposalEvaluateResponse(BaseModel):
    task_id: str = Field(description="Task identifier.")
    proposal_id: str = Field(description="Proposal identifier.")
    verification_status: str = Field(
        description="Verification outcome: VERIFIED_SUCCESS, VERIFIED_FAILURE, or UNVERIFIED."
    )
    tests_executed: bool = Field(
        description="True if pytest confirmed execution of at least one test."
    )
    exit_code: int | None = Field(
        default=None,
        description="Subprocess return code from pytest (0 = success).",
    )
    evidence: str = Field(
        description="Structured multi-line verification evidence trail."
    )
    selected_test_file: str = Field(
        default="",
        description="Path of the test fixture that was executed.",
    )
    stdout: str = Field(
        default="",
        description="Standard output captured from pytest.",
    )
    stderr: str = Field(
        default="",
        description="Standard error captured from pytest.",
    )


class ProposalPersistRequest(BaseModel):
    task_id: str = Field(
        ...,
        min_length=3,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
        description="Task ID associated with the proposal.",
    )
    task_description: str = Field(
        ...,
        min_length=1,
        description="Task description.",
    )
    problem_title: str = Field(
        ...,
        min_length=1,
        description="Title of the problem for graph memory indexing.",
    )
    category: str = Field(
        ...,
        min_length=1,
        description="Problem domain category.",
    )
    lesson_content: str | None = Field(
        default=None,
        description="Reusable insight. Required if verification succeeded or failed.",
    )
    proposed_fix: str | None = Field(
        default=None,
        description="Optional proposed fix override if not retrieved from evaluation cache.",
    )

    @field_validator("task_id", "task_description", "problem_title", "category")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty.")
        return stripped


class ProposalPersistResponse(BaseModel):
    task_id: str = Field(description="Task identifier.")
    proposal_id: str = Field(description="Proposal identifier.")
    verification_status: str = Field(
        description="Verification status of the recorded outcome."
    )
    lesson_saved: bool = Field(
        description="True if a Lesson node was persisted to FalkorDB."
    )
    lesson_id: str | None = Field(
        default=None,
        description="ID of persisted Lesson node if saved, otherwise None.",
    )
    outcome_id: str = Field(
        description="ID of the persisted Outcome node in FalkorDB."
    )
    verification_evidence: str | None = Field(
        default=None,
        description="Audit evidence stored with the outcome.",
    )


class HealthResponse(BaseModel):
    status: str = Field(
        default="healthy",
        description="Overall service health status ('healthy' or 'degraded').",
    )
    service: str = Field(
        default="HiveMind API",
        description="Name of the service.",
    )
    database_connected: bool = Field(
        default=True,
        description="Whether FalkorDB is reachable.",
    )
    version: str = Field(
        default="1.0.0",
        description="API version.",
    )
