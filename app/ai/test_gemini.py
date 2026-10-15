
from app.ai.gemini_client import generate_text


def main() -> None:
    response = generate_text(
        "Reply with exactly this text: HiveMind Gemini connection successful"
    )

    print("Gemini response:")
    print(response)


if __name__ == "__main__":
    main()
