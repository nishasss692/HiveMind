
from typing import Literal

from pydantic import BaseModel, Field


VerificationStatus = Literal[
    "VERIFIED_SUCCESS",
    "VERIFIED_FAILURE",
    "UNVERIFIED",
]


class TestExecutionResult(BaseModel):
    """Results reported by a test runner or controlled test fixture."""

    command: str
    exit_code: int | None
    tests_executed: bool
    stdout: str = ""
    stderr: str = ""


class VerificationResult(BaseModel):
    """Evidence-backed result produced by the Verifier."""

    status: VerificationStatus
    evidence: str
    command: str
    exit_code: int | None
    tests_executed: bool


class Verifier:
    """Classifies test results without executing code itself."""

    def verify(
        self,
        result: TestExecutionResult,
    ) -> VerificationResult:
        if not result.tests_executed or result.exit_code is None:
            status: VerificationStatus = "UNVERIFIED"
        elif result.exit_code == 0:
            status = "VERIFIED_SUCCESS"
        else:
            status = "VERIFIED_FAILURE"

        evidence_parts = [
            f"Test command: {result.command}",
            f"Tests executed: {result.tests_executed}",
            f"Exit code: {result.exit_code}",
            f"Verification status: {status}",
        ]

        if result.stdout.strip():
            evidence_parts.append(
                "Standard output:\n" + result.stdout[-4000:]
            )

        if result.stderr.strip():
            evidence_parts.append(
                "Standard error:\n" + result.stderr[-4000:]
            )

        evidence = "\n".join(evidence_parts)

        return VerificationResult(
            status=status,
            evidence=evidence,
            command=result.command,
            exit_code=result.exit_code,
            tests_executed=result.tests_executed,
        )
