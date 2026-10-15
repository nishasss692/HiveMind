
from app.ai.verifier import (
    TestExecutionResult,
    Verifier,
)


def main():
    verifier = Verifier()

    scenarios = [
        TestExecutionResult(
            command="pytest tests/test_fix.py",
            exit_code=0,
            tests_executed=True,
            stdout="3 passed in 0.42s",
        ),
        TestExecutionResult(
            command="pytest tests/test_fix.py",
            exit_code=1,
            tests_executed=True,
            stdout="1 failed, 2 passed",
            stderr="AssertionError: expected 5, received 4",
        ),
        TestExecutionResult(
            command="pytest tests/test_fix.py",
            exit_code=None,
            tests_executed=False,
            stdout="Test execution could not be confirmed.",
        ),
    ]

    expected = [
        "VERIFIED_SUCCESS",
        "VERIFIED_FAILURE",
        "UNVERIFIED",
    ]

    for index, (scenario, expected_status) in enumerate(
        zip(scenarios, expected),
        start=1,
    ):
        result = verifier.verify(scenario)

        assert result.status == expected_status, (
            f"Scenario {index}: expected {expected_status}, "
            f"got {result.status}"
        )

        print(f"Scenario {index}: {result.status}")

    print("\nAll Verifier checks passed.")


if __name__ == "__main__":
    main()
