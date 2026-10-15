
from falkordb import FalkorDB


def main() -> None:
    # Connect to the local FalkorDB server.
    client = FalkorDB(host="localhost", port=6379)

    # Select (or create when first used) HiveMind's graph.
    graph = client.select_graph("hivemind")

    # Save a sample problem and its first attempt.
    graph.query("""
        MERGE (p:Problem {id: 'problem-001'})
        SET p.title = 'Database migration dependency error',
            p.category = 'database_migration'

        MERGE (t:Task {id: 'task-001'})
        SET t.description = 'A migration fails because of dependency order'

        MERGE (a:Attempt {id: 'attempt-001'})
        SET a.description = 'Attempted to rename a column directly',
            a.status = 'VERIFIED_FAILURE'

        MERGE (t)-[:HAS_PROBLEM]->(p)
        MERGE (p)-[:HAS_ATTEMPT]->(a)
    """)

    # Retrieve the saved experience and its relationships.
    result = graph.query("""
        MATCH (t:Task {id: 'task-001'})
              -[:HAS_PROBLEM]->(p:Problem)
              -[:HAS_ATTEMPT]->(a:Attempt)
        RETURN t.id, p.title, a.id, a.status
    """)

    print("\nHiveMind graph-memory smoke test")
    print("--------------------------------")

    if not result.result_set:
        raise RuntimeError(
            "No data was retrieved. Check the graph query and connection."
        )

    for row in result.result_set:
        print(f"Task ID:    {row[0]}")
        print(f"Problem:    {row[1]}")
        print(f"Attempt ID: {row[2]}")
        print(f"Status:     {row[3]}")

    print("\nSUCCESS: HiveMind saved and retrieved graph memory.")


if __name__ == "__main__":
    main()
