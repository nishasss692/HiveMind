import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Project root directory
PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = PROJECT_ROOT / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=True)
else:
    load_dotenv(override=True)


@dataclass
class Settings:
    """Application configuration loaded from environment variables."""

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.8-flash"
    falkordb_host: str = "localhost"
    falkordb_port: int = 6379
    falkordb_graph_name: str = "hivemind"
    lifecycle_db_path: str = str(PROJECT_ROOT / "data" / "lifecycle.db")
    cors_allowed_origins: list[str] | None = None
    api_v1_prefix: str = "/api/v1"
    project_name: str = "HiveMind API"
    version: str = "1.0.0"

    def __post_init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", self.gemini_api_key)
        self.gemini_model = os.getenv("GEMINI_MODEL", self.gemini_model)
        self.falkordb_host = os.getenv("FALKORDB_HOST", self.falkordb_host)

        port_str = os.getenv("FALKORDB_PORT")
        if port_str:
            try:
                self.falkordb_port = int(port_str)
            except ValueError:
                self.falkordb_port = 6379

        self.falkordb_graph_name = os.getenv(
            "FALKORDB_GRAPH_NAME", self.falkordb_graph_name
        )
        self.lifecycle_db_path = os.getenv(
            "LIFECYCLE_DB_PATH", self.lifecycle_db_path
        )

        cors_env = os.getenv("CORS_ALLOWED_ORIGINS")
        if cors_env:
            self.cors_allowed_origins = [
                origin.strip() for origin in cors_env.split(",") if origin.strip()
            ]
        elif self.cors_allowed_origins is None:
            self.cors_allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
            ]


_settings: Settings | None = None


def get_settings() -> Settings:
    """Retrieve the cached configuration settings."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
