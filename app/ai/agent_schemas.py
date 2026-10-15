
from pydantic import BaseModel, Field


class SolverResponse(BaseModel):
    proposal_id: str | None = Field(
        default=None,
        description="Unique identifier for this proposal.",
    )
    diagnosis: str = Field(
        description="Likely cause of the reported problem."
    )
    proposed_fix: str = Field(
        description="A concrete proposed approach to fix the problem."
    )
    reasoning: str = Field(
        description="Why this approach may address the problem."
    )
    tests_to_run: list[str] = Field(
        description="Tests needed to verify the proposed fix."
    )
    memory_ids_used: list[str] = Field(
        description="IDs of retrieved lessons that influenced the proposal."
    )
    risks: list[str] = Field(
        description="Remaining uncertainties or risks."
    )
