
# pyrefly: ignore [missing-import]
from app.ai.investigator import Investigator
# pyrefly: ignore [missing-import]
from app.ai.solver import Solver
from app.memory.graph_repository import GraphMemoryRepository


def main():
    repository = GraphMemoryRepository()
    investigator = Investigator(repository)

    task = (
        "My database upgrade fails because a schema change "
        "runs in the wrong order."
    )

    result = investigator.investigate(
        task_description=task,
        category="database_migration",
        limit=5,
    )

    memories = result["memories"]
    print(f"Retrieved {len(memories)} memories.")

    for memory in memories:
        print(
            f"- {memory['lesson_id']}: "
            f"{memory['outcome_status']} | {memory['lesson']}"
        )

    solver = Solver()
    proposal = solver.propose(
        task_description=task,
        memories=memories,
    )

    print("\nGemini Solver Proposal")
    print("======================")
    print("Diagnosis:", proposal.diagnosis)
    print("Proposed fix:", proposal.proposed_fix)
    print("Reasoning:", proposal.reasoning)
    print("Tests to run:", proposal.tests_to_run)
    print("Memories used:", proposal.memory_ids_used)
    print("Risks:", proposal.risks)
    print("\nThis is a proposal, not a verified fix.")


if __name__ == "__main__":
    main()
