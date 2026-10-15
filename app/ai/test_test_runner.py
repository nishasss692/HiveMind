
from app.ai.test_runner import TestRunner
from app.ai.verifier import Verifier


def main():
    runner = TestRunner(timeout_seconds=30)

    execution = runner.run("tests/test_runner_smoke.py")
    verification = Verifier().verify(execution)

    print("Exit code:", execution.exit_code)
    print("Tests executed:", execution.tests_executed)
    print("Verification status:", verification.status)
    print(verification.evidence)

    assert execution.tests_executed
    assert verification.status == "VERIFIED_SUCCESS"

    print("\nTest runner infrastructure passed.")


if __name__ == "__main__":
    main()
