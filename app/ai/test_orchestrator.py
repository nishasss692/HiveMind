
from app.ai.orchestrator import HiveMindOrchestrator


def main():
    hivemind = HiveMindOrchestrator()

    print("HiveMind orchestrator initialized.")
    print("Investigator:", type(hivemind.investigator).__name__)
    print("Solver:", type(hivemind.solver).__name__)
    print("Verifier:", type(hivemind.verifier).__name__)
    print("Memory Curator:", type(hivemind.curator).__name__)

    print("\nOrchestrator initialization passed.")


if __name__ == "__main__":
    main()
