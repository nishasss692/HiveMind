
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, model_validator


VerificationStatus = Literal[
    "VERIFIED_SUCCESS",
    "VERIFIED_FAILURE",
    "UNVERIFIED",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class TaskRecord(BaseModel):
    id: str
    description: str
    created_at: str = Field(default_factory=utc_now)


class ProblemRecord(BaseModel):
    id: str
    title: str
    category: str
    description: str = ""


class AgentRecord(BaseModel):
    id: str
    role: Literal[
        "INVESTIGATOR",
        "SOLVER",
        "VERIFIER",
        "MEMORY_CURATOR",
    ]


class AttemptRecord(BaseModel):
    id: str
    description: str
    status: VerificationStatus = "UNVERIFIED"
    created_at: str = Field(default_factory=utc_now)


class SolutionRecord(BaseModel):
    id: str
    description: str


class FailureRecord(BaseModel):
    id: str
    description: str
    error_type: str = "unknown"


class OutcomeRecord(BaseModel):
    id: str
    status: VerificationStatus
    evidence: str
    verified_at: str = Field(default_factory=utc_now)


class LessonRecord(BaseModel):
    id: str
    content: str
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    created_at: str = Field(default_factory=utc_now)


class ExperienceRecord(BaseModel):
    task: TaskRecord
    problem: ProblemRecord
    attempt: AttemptRecord
    agent: AgentRecord

    solution: SolutionRecord | None = None
    failure: FailureRecord | None = None
    outcome: OutcomeRecord | None = None
    lesson: LessonRecord | None = None

    @model_validator(mode="after")
    def validate_evidence(self):
        # An attempt's status must agree with its recorded outcome.
        if self.outcome is not None:
            if self.attempt.status != self.outcome.status:
                raise ValueError(
                    "Attempt status must match outcome status."
                )

        # A lesson must have a verified supporting outcome.
        if self.lesson is not None:
            if self.outcome is None:
                raise ValueError(
                    "A lesson requires a supporting outcome."
                )

            if self.outcome.status == "UNVERIFIED":
                raise ValueError(
                    "Cannot save a lesson from an unverified outcome."
                )

            if not self.outcome.evidence.strip():
                raise ValueError(
                    "A lesson requires non-empty verification evidence."
                )

        return self
