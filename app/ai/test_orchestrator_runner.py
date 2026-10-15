from app.ai.orchestrator import HiveMindOrchestrator


def main():
    orchestrator = HiveMindOrchestrator()

    result = orchestrator.run_tests("tests/test_runner_smoke.py")

    print("\nVerification status:")
    print(result["verification_status"])

    print("\nEvidence:")
    print(result["evidence"])

    assert result["verification_status"] == "VERIFIED_SUCCESS", (
        f"Expected VERIFIED_SUCCESS, got {result['verification_status']}"
    )

    print("\nConfirmation: No lesson was saved by this test run.")
    print("Orchestrator test-runner integration passed.")


if __name__ == "__main__":
    main()
