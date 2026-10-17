import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.exceptions

try:
    from google.genai import errors as genai_errors
except ImportError:
    genai_errors = None

from backend.api.proposals import router as proposals_router
from backend.config import get_settings
from backend.schemas import HealthResponse
from backend.services.orchestration import get_orchestration_service

logger = logging.getLogger("hivemind")

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    description="Backend API for HiveMind's evidence-backed AI memory system",
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS (Objective 8: Restrict allowed origins appropriately for development setup)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers aligned with docs/BACKEND_INTEGRATION.md
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return 400 Bad Request for request validation errors per integration spec."""
    error_details = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Validation error")
        error_details.append(f"{loc}: {msg}")
    detail_str = "; ".join(error_details)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": f"Validation failed: {detail_str}"},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle ValueErrors according to specific integration rules."""
    msg = str(exc)
    msg_lower = msg.lower()

    # Rule: Not found -> 404 Not Found
    if "not found" in msg_lower:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": msg},
        )

    # Rule: Conflicting parameters on repeated requests -> 409 Conflict
    if "conflict" in msg_lower:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": msg},
        )

    # Rule: Test file outside tests/ directory -> 403 Forbidden
    if "tests directory" in msg_lower or "tests/" in msg_lower and "outside" in msg_lower:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": msg},
        )

    # Rule: Missing or unverified lesson save -> 422 Unprocessable Entity
    if (
        "lesson" in msg_lower
        or "unverified" in msg_lower
        or "outcome requires" in msg_lower
        or "requires lesson_content" in msg_lower
    ):
        return JSONResponse(
            status_code=getattr(
                status, "HTTP_422_UNPROCESSABLE_CONTENT", 422
            ),
            content={"detail": msg},
        )

    # Default ValueError -> 400 Bad Request
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": msg},
    )


@app.exception_handler(FileNotFoundError)
async def file_not_found_handler(request: Request, exc: FileNotFoundError):
    """Handle missing test fixtures -> 404 Not Found."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
    )


@app.exception_handler(redis.exceptions.ConnectionError)
async def redis_connection_error_handler(
    request: Request, exc: redis.exceptions.ConnectionError
):
    """Handle FalkorDB connection failures -> 502 Bad Gateway."""
    logger.error(f"FalkorDB connection failed: {exc}")
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": "Database connection error. FalkorDB is unreachable."},
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    """Handle missing credentials or runtime solver errors."""
    msg = str(exc)
    if "GEMINI_API_KEY" in msg:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": (
                    "GEMINI_API_KEY is missing or invalid. "
                    "Configure GEMINI_API_KEY in the project root .env file."
                )
            },
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": msg},
    )


if genai_errors and hasattr(genai_errors, "APIError"):

    @app.exception_handler(genai_errors.APIError)
    async def genai_api_error_handler(request: Request, exc: Exception):
        """Handle Gemini API errors without leaking secrets to API clients."""
        logger.error(f"Gemini API error occurred: {exc}")
        msg = str(exc)
        msg_lower = msg.lower()

        # Handle invalid, unauthorized, unauthenticated, or placeholder API keys
        if (
            "api key not valid" in msg_lower
            or "api_key_invalid" in msg_lower
            or "unauthenticated" in msg_lower
            or "permission_denied" in msg_lower
            or "invalid api key" in msg_lower
        ):
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "detail": (
                        "GEMINI_API_KEY is invalid, unauthorized, or contains the default placeholder. "
                        "Please configure a valid GEMINI_API_KEY in the project root .env file to generate proposals."
                    )
                },
            )

        # Handle rate limits and resource exhaustion
        if "quota" in msg_lower or "resource_exhausted" in msg_lower or "429" in msg:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Gemini AI rate limit or quota exceeded. Please try again later."
                },
                headers={"Retry-After": "5"},
            )

        # Handle Gemini server-side errors (503 / 500)
        if (
            isinstance(exc, getattr(genai_errors, "ServerError", ()))
            or "503" in msg
            or "unavailable" in msg_lower
        ):
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"detail": "Gemini AI service temporarily unavailable."},
                headers={"Retry-After": "5"},
            )

        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"detail": "Upstream Gemini AI model returned an error."},
        )


# Health check endpoints
@app.get("/health", response_model=HealthResponse, tags=["health"])
@app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
def health_check() -> dict[str, Any]:
    """Check API and database health status."""
    service = get_orchestration_service()
    health_info = service.check_health()
    return {
        "status": health_info["status"],
        "service": settings.project_name,
        "database_connected": health_info["database_connected"],
        "version": settings.version,
    }


# Include proposals router under /api/v1 and /api aliases
app.include_router(proposals_router, prefix="/api/v1")
app.include_router(proposals_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
