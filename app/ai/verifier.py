
from typing import Literal

from pydantic import BaseModel, Field


VerificationStatus = Literal[
    "VERIFIED_SUCCESS",
    "VERIFIED_FAILURE",
    "UNVERIFIED",
]


class TestExecutionResult(BaseModel):
    """Results reported by a test runner or controlled test fixture."""

    __test__ = False

    command: str
    exit_code: int | None
    tests_executed: bool
    stdout: str = ""
    stderr: str = ""
    test_file: str = ""


class TestSpecification(BaseModel):
    """Explicit specification of tests designated to verify a proposal."""

    __test__ = False

    proposal_id: str
    test_file: str
    task_id: str = ""
    is_relevant: bool = True
    description: str = ""


class VerificationResult(BaseModel):
    """Evidence-backed result produced by the Verifier."""

    status: VerificationStatus
    evidence: str
    command: str
    exit_code: int | None
    tests_executed: bool
    proposal_id: str | None = None
    test_file: str | None = None


class Verifier:
    """Classifies test results without executing code itself."""

    def verify(
        self,
        result: TestExecutionResult,
        test_spec: TestSpecification | None = None,
    ) -> VerificationResult:
        evidence_parts = [
            f"Test command: {result.command}",
            f"Tests executed: {result.tests_executed}",
            f"Exit code: {result.exit_code}",
        ]

        if test_spec is not None:
            evidence_parts.append(f"Proposal ID: {test_spec.proposal_id}")
            evidence_parts.append(f"Designated test file: {test_spec.test_file}")
            evidence_parts.append(f"Test relevance: {test_spec.is_relevant}")

        # Rule 1: Tests not executed or timed out -> UNVERIFIED.
        if not result.tests_executed or result.exit_code is None:
            status: VerificationStatus = "UNVERIFIED"
            evidence_parts.append(
                "Verification note: Test execution could not be confirmed or timed out."
            )
        # Rule 2: If a test specification is provided, it must be relevant.
        elif test_spec is not None and not test_spec.is_relevant:
            status = "UNVERIFIED"
            evidence_parts.append(
                f"Verification note: Test is not designated as relevant to proposal {test_spec.proposal_id}."
            )
        # Rule 3: Test file mismatch between execution and specification.
        elif (
            test_spec is not None
            and test_spec.test_file
            and result.test_file
            and (
                test_spec.test_file.replace("\\", "/").strip().lower()
                != result.test_file.replace("\\", "/").strip().lower()
            )
        ):
            status = "UNVERIFIED"
            evidence_parts.append(
                f"Verification note: Executed test file ({result.test_file}) "
                f"does not match designated test file ({test_spec.test_file})."
            )
        # Rule 4: Clean execution with exit code 0 -> VERIFIED_SUCCESS.
        elif result.exit_code == 0:
            status = "VERIFIED_SUCCESS"
        # Rule 5: Confirmed execution with non-zero exit code -> VERIFIED_FAILURE.
        else:
            status = "VERIFIED_FAILURE"

        evidence_parts.append(f"Verification status: {status}")

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
            proposal_id=test_spec.proposal_id if test_spec else None,
            test_file=test_spec.test_file if test_spec else (result.test_file or None),
        )

    def verify_proposal(
        self,
        proposal_id: str,
        result: TestExecutionResult,
        test_spec: TestSpecification | None,
    ) -> VerificationResult:
        """Verify a proposal against a test result and explicit test specification.

        If the test result cannot be linked to the intended proposal and a
        relevant test specification, returns UNVERIFIED.
        """
        if test_spec is None:
            return VerificationResult(
                status="UNVERIFIED",
                evidence=(
                    f"Test command: {result.command}\n"
                    f"Tests executed: {result.tests_executed}\n"
                    f"Exit code: {result.exit_code}\n"
                    f"Proposal ID: {proposal_id}\n"
                    "Verification status: UNVERIFIED\n"
                    "Verification note: No test specification provided. "
                    "Cannot link test result to intended proposal."
                ),
                command=result.command,
                exit_code=result.exit_code,
                tests_executed=result.tests_executed,
                proposal_id=proposal_id,
                test_file=result.test_file or None,
            )

        if test_spec.proposal_id != proposal_id:
            return VerificationResult(
                status="UNVERIFIED",
                evidence=(
                    f"Test command: {result.command}\n"
                    f"Tests executed: {result.tests_executed}\n"
                    f"Exit code: {result.exit_code}\n"
                    f"Proposal ID: {proposal_id}\n"
                    f"Spec Proposal ID: {test_spec.proposal_id}\n"
                    "Verification status: UNVERIFIED\n"
                    f"Verification note: Test specification proposal ID ({test_spec.proposal_id}) "
                    f"does not match intended proposal ID ({proposal_id})."
                ),
                command=result.command,
                exit_code=result.exit_code,
                tests_executed=result.tests_executed,
                proposal_id=proposal_id,
                test_file=test_spec.test_file,
            )

        return self.verify(result=result, test_spec=test_spec)
