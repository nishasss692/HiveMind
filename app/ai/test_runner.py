
import re
import subprocess
import sys
from pathlib import Path

from app.ai.verifier import TestExecutionResult


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TESTS_ROOT = (PROJECT_ROOT / "tests").resolve()


class TestRunner:
    """Runs an explicitly selected pytest file inside the tests directory."""

    __test__ = False

    def __init__(self, timeout_seconds: int = 60):
        if timeout_seconds < 1:
            raise ValueError("Timeout must be at least 1 second.")

        self.timeout_seconds = timeout_seconds

    def run(self, test_file: str) -> TestExecutionResult:
        requested_path = Path(test_file)

        if requested_path.is_absolute():
            test_path = requested_path.resolve()
        else:
            test_path = (PROJECT_ROOT / requested_path).resolve()

        # Only permit test files under the designated tests directory.
        try:
            test_path.relative_to(TESTS_ROOT)
        except ValueError:
            raise ValueError(
                "Tests must be located inside the project tests directory."
            )

        if not test_path.is_file():
            raise FileNotFoundError(
                f"Test file does not exist: {test_path}"
            )

        if test_path.suffix != ".py":
            raise ValueError("Only Python pytest files are supported.")

        command = [
            sys.executable,
            "-m",
            "pytest",
            str(test_path),
            "-q",
        ]

        try:
            process = subprocess.run(
                command,
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                check=False,
                shell=False,
            )
        except subprocess.TimeoutExpired as exc:
            stdout = exc.stdout or ""
            stderr = exc.stderr or ""

            if isinstance(stdout, bytes):
                stdout = stdout.decode(errors="replace")
            if isinstance(stderr, bytes):
                stderr = stderr.decode(errors="replace")

            rel_test_file = test_path.relative_to(PROJECT_ROOT).as_posix()
            return TestExecutionResult(
                command=f"python -m pytest {rel_test_file} -q",
                exit_code=None,
                tests_executed=False,
                stdout=stdout,
                stderr=(
                    str(stderr)
                    + f"\nTest run timed out after "
                    f"{self.timeout_seconds} seconds."
                ),
                test_file=rel_test_file,
            )

        output = process.stdout + "\n" + process.stderr

        # Require evidence that pytest actually ran at least one test.
        summary_pattern = (
            r"\b\d+\s+"
            r"(?:passed|failed|error|errors|skipped|xfailed|xpassed)"
            r"\b"
        )
        tests_executed = bool(re.search(summary_pattern, output))
        rel_test_file = test_path.relative_to(PROJECT_ROOT).as_posix()

        return TestExecutionResult(
            command=f"python -m pytest {rel_test_file} -q",
            exit_code=process.returncode,
            tests_executed=tests_executed,
            stdout=process.stdout,
            stderr=process.stderr,
            test_file=rel_test_file,
        )
