import json
import logging
import sqlite3
from pathlib import Path
from typing import Any

from app.ai.agent_schemas import SolverResponse
from app.ai.verifier import (
    TestExecutionResult,
    TestSpecification,
    VerificationResult,
)

logger = logging.getLogger(__name__)


def _serialize_obj(obj: Any) -> Any:
    """Helper to convert dataclasses / Pydantic models to JSON-serializable structures."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    if hasattr(obj, "__dict__"):
        return {k: _serialize_obj(v) for k, v in obj.__dict__.items()}
    if isinstance(obj, dict):
        return {k: _serialize_obj(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serialize_obj(i) for i in obj]
    return obj


def _reconstruct_models(data: dict[str, Any]) -> dict[str, Any]:
    """Reconstruct Pydantic/dataclass models from loaded JSON dictionary."""
    result = dict(data)
    if "proposal" in result and isinstance(result["proposal"], dict):
        try:
            result["proposal"] = SolverResponse(**result["proposal"])
        except Exception:
            pass

    if "test_execution" in result and isinstance(result["test_execution"], dict):
        try:
            result["test_execution"] = TestExecutionResult(**result["test_execution"])
        except Exception:
            pass

    if "test_specification" in result and isinstance(result["test_specification"], dict):
        try:
            result["test_specification"] = TestSpecification(**result["test_specification"])
        except Exception:
            pass

    if "verification" in result and isinstance(result["verification"], dict):
        try:
            result["verification"] = VerificationResult(**result["verification"])
        except Exception:
            pass

    return result


class LifecycleStore:
    """SQLite-backed storage for proposal lifecycles, ensuring persistence across restarts and workers."""

    def __init__(self, db_path: str | Path):
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        if self.db_path != ":memory:":
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA busy_timeout=5000;")
            conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS proposals (
                    proposal_id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    task_description TEXT NOT NULL,
                    proposed_fix TEXT NOT NULL,
                    data_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS evaluations (
                    proposal_id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    task_description TEXT NOT NULL,
                    proposed_fix TEXT NOT NULL,
                    test_file TEXT NOT NULL,
                    is_relevant INTEGER NOT NULL,
                    test_description TEXT,
                    verification_status TEXT NOT NULL,
                    data_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(proposal_id) REFERENCES proposals(proposal_id)
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS persisted (
                    proposal_id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    task_description TEXT NOT NULL,
                    problem_title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    lesson_content TEXT,
                    proposed_fix TEXT,
                    verification_status TEXT NOT NULL,
                    data_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(proposal_id) REFERENCES proposals(proposal_id)
                );
                """
            )
            conn.commit()

    def save_proposal(
        self,
        proposal_id: str,
        task_id: str,
        task_description: str,
        proposed_fix: str,
        data: dict[str, Any],
    ) -> None:
        data_json = json.dumps(_serialize_obj(data))
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO proposals (proposal_id, task_id, task_description, proposed_fix, data_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (proposal_id, task_id, task_description, proposed_fix, data_json),
            )
            conn.commit()

    def get_proposal(self, proposal_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT data_json FROM proposals WHERE proposal_id = ?",
                (proposal_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            return _reconstruct_models(json.loads(row["data_json"]))

    def save_evaluation(
        self,
        proposal_id: str,
        task_id: str,
        task_description: str,
        proposed_fix: str,
        test_file: str,
        is_relevant: bool,
        test_description: str,
        verification_status: str,
        data: dict[str, Any],
    ) -> None:
        data_json = json.dumps(_serialize_obj(data))
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO evaluations (
                    proposal_id, task_id, task_description, proposed_fix,
                    test_file, is_relevant, test_description, verification_status, data_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    proposal_id,
                    task_id,
                    task_description,
                    proposed_fix,
                    test_file,
                    1 if is_relevant else 0,
                    test_description,
                    verification_status,
                    data_json,
                ),
            )
            conn.commit()

    def get_evaluation(self, proposal_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT data_json FROM evaluations WHERE proposal_id = ?",
                (proposal_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            return _reconstruct_models(json.loads(row["data_json"]))

    def get_evaluation_params(self, proposal_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT task_id, task_description, proposed_fix, test_file, is_relevant, test_description
                FROM evaluations WHERE proposal_id = ?
                """,
                (proposal_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            return {
                "task_id": row["task_id"],
                "task_description": row["task_description"],
                "proposed_fix": row["proposed_fix"],
                "test_file": row["test_file"],
                "is_relevant": bool(row["is_relevant"]),
                "test_description": row["test_description"] or "",
            }

    def save_persisted(
        self,
        proposal_id: str,
        task_id: str,
        task_description: str,
        problem_title: str,
        category: str,
        lesson_content: str | None,
        proposed_fix: str | None,
        verification_status: str,
        data: dict[str, Any],
    ) -> None:
        data_json = json.dumps(_serialize_obj(data))
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO persisted (
                    proposal_id, task_id, task_description, problem_title, category,
                    lesson_content, proposed_fix, verification_status, data_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    proposal_id,
                    task_id,
                    task_description,
                    problem_title,
                    category,
                    lesson_content,
                    proposed_fix,
                    verification_status,
                    data_json,
                ),
            )
            conn.commit()

    def get_persisted(self, proposal_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT data_json FROM persisted WHERE proposal_id = ?",
                (proposal_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            return json.loads(row["data_json"])

    def get_persisted_params(self, proposal_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT task_id, task_description, problem_title, category, lesson_content, proposed_fix
                FROM persisted WHERE proposal_id = ?
                """,
                (proposal_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            return {
                "task_id": row["task_id"],
                "task_description": row["task_description"],
                "problem_title": row["problem_title"],
                "category": row["category"],
                "lesson_content": row["lesson_content"],
                "proposed_fix": row["proposed_fix"],
            }

    def clear(self) -> None:
        """Clear all stored lifecycle records (for testing)."""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM persisted;")
            conn.execute("DELETE FROM evaluations;")
            conn.execute("DELETE FROM proposals;")
            conn.commit()
