
from app.ai.orchestrator import HiveMindOrchestrator


def main():
    hivemind = HiveMindOrchestrator()

    task = (
        "My database migration fails because a column is renamed "
        "before the migration that creates it has run. "
        "How should I investigate and fix the dependency order?"
    )

    print("Step 1: Investigating graph memory...")

    result = hivemind.propose_solution(
        task_description=task,
        category="database_migration",
        limit=5,
    )

    print("Memories retrieved:", result["memory_count"])

    for memory in result["memories"]:
        print(
            f"- {memory['lesson_id']} "
            f"[{memory['outcome_status']}]"
        )

    proposal = result["proposal"]

    print("\nStep 2: Gemini Solver proposal")
    print("Diagnosis:", proposal.diagnosis)
    print("Proposed fix:", proposal.proposed_fix)
    print("Reasoning:", proposal.reasoning)
    print("Tests to run:", proposal.tests_to_run)
    print("Memories used:", proposal.memory_ids_used)
    print("Risks:", proposal.risks)

    print("\nStep 3: Workflow status")
    print("Verification:", result["verification_status"])

    assert result["verification_status"] == "UNVERIFIED"

    print("\nPROPOSAL WORKFLOW PASSED.")
    print("The proposed fix has not been verified.")


if __name__ == "__main__":
    main()
