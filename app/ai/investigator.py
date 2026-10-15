
from typing import Any

from app.memory.graph_repository import GraphMemoryRepository
from app.memory.retrieval import MemoryRetriever


class Investigator:
    def __init__(self, repository: GraphMemoryRepository):
        self.retriever = MemoryRetriever(repository)

    def investigate(
        self,
        task_description: str,
        category: str | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:
        memories = self.retriever.search(
            task_description=task_description,
            category=category,
            limit=limit,
        )

        return {
            "task_description": task_description,
            "memories": memories,
            "memory_count": len(memories),
        }
