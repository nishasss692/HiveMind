
import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types


# Load environment variables from the project-root .env file.
load_dotenv(override=True)


def create_gemini_client() -> genai.Client:
    """Create a Gemini API client using the configured API key."""
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is missing. "
            "Add it to the .env file in your project root."
        )

    return genai.Client(api_key=api_key)


def get_model_name() -> str:
    """Return the model configured in .env."""
    return os.getenv(
        "GEMINI_MODEL",
        "gemini-3.8-flash",
    )


def generate_text(
    prompt: str,
    temperature: float = 0.2,
    max_retries: int = 3,
) -> str:
    """
    Generate text using Gemini.

    Retries temporary server errors up to max_retries times.
    Does not retry indefinitely or hide the final error.
    """
    if not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    if not 0.0 <= temperature <= 2.0:
        raise ValueError("Temperature must be between 0 and 2.")

    if max_retries < 1:
        raise ValueError("max_retries must be at least 1.")

    client = create_gemini_client()
    model_name = get_model_name()

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                ),
            )

            if not response.text:
                raise RuntimeError(
                    "Gemini returned an empty response."
                )

            return response.text

        except errors.ServerError:
            # Temporary server-side errors, such as HTTP 503.
            if attempt == max_retries - 1:
                raise

            delay = 2 ** (attempt + 1)

            print(
                f"Gemini server temporarily unavailable. "
                f"Retry {attempt + 1}/{max_retries - 1} "
                f"in {delay} seconds."
            )

            time.sleep(delay)

    raise RuntimeError("Gemini request failed after retries.")

