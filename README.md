# HiveMind — Evidence-Backed Collective Graph Memory for AI Coding Agents

HiveMind enables AI coding agents to share lessons learned across tasks and incidents. Unlike traditional LLM coding assistants that forget past failures and re-invent broken approaches, HiveMind captures coding attempts, enforces rigorous empirical test verification, and stores evidence-backed lessons in **FalkorDB Graph Memory**.

---

## 1. Quick Start & Prerequisites

### Prerequisites
- **Python**: 3.11+ (tested on Python 3.13)
- **FalkorDB**: Running on `localhost:6379`
- **Virtual Environment**: `.venv` in repository root

### Starting FalkorDB
FalkorDB runs via Docker:
```bash
docker-compose up -d falkordb
```
To verify FalkorDB connection:
```bash
.venv\Scripts\python.exe -c "from app.memory.graph_repository import GraphMemoryRepository; repo = GraphMemoryRepository(); print('FalkorDB Connected:', repo.ping())"
```

### Environment Variables
Configured in the project-root `.env`:
```env
# Gemini LLM configuration (Required for live Gemini solver; not required for deterministic demo)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# FalkorDB settings (defaults used if omitted)
FALKORDB_HOST=localhost
FALKORDB_PORT=6379
```

---

## 2. Running the Showcase Demo

The cross-task learning loop demonstration illustrates the full 5-stage lifecycle of HiveMind:

```bash
# Run standalone demonstration (deterministic, zero external API cost)
.venv\Scripts\python.exe app/ai/demo_learning_loop.py
```

### Demo Stages & Expected Output
1. **Stage 1 (Task 1 Submission)**:
   - Incident: Database migration deadlock on an active orders table.
   - Solver proposes: Non-blocking concurrent index build.
   - Status: Marked strictly as `UNVERIFIED`.
2. **Stage 2 (Controlled Fixture Execution & Verification)**:
   - Designates `tests/test_migration_fixture.py`.
   - TestRunner executes pytest in a controlled sandbox.
   - Verifier checks proposal ID matching and exit code 0.
   - Status updated to `VERIFIED_SUCCESS` with an empirical evidence trail.
3. **Stage 3 (Graph Memory Persistence)**:
   - MemoryCurator creates an `ExperienceRecord` and persists nodes in FalkorDB: `(Task)->[:HAS_PROBLEM]->(Problem)->[:HAS_ATTEMPT]->(Attempt)->[:PRODUCED_OUTCOME]->(Outcome)` and `(Lesson)-[:SUPPORTED_BY]->(Outcome)`.
4. **Stage 4 (Cross-Task Learning & Retrieval)**:
   - Task 2 submitted: Similar table lock timeout on a customers table.
   - Investigator queries FalkorDB via `MemoryRetriever`.
   - Exact lesson from Task 1 is retrieved with its verified evidence and similarity score.
5. **Stage 5 (Grounded Second Proposal)**:
   - Solver incorporates the retrieved lesson ID into `memory_ids_used`.
   - Fix reasoning is explicitly grounded in the previous empirical lesson.

---

## 3. Running Test Suites

HiveMind maintains strict separation between **deterministic regression tests** (free, offline, rapid) and **live Gemini provider tests**.

### A. Deterministic Pytest Regression Suite (Offline)
Runs all 16 evidence-integrity, schema-validation, ranking, and sandbox tests:
```bash
.venv\Scripts\python.exe -m pytest -v
```

### B. Full End-to-End Learning Loop Test
Tests the full cross-task learning loop including idempotency and rejection checks:
```bash
.venv\Scripts\python.exe app/ai/test_end_to_end_learning.py
```

### C. Live Gemini Provider Workflows (Requires API Key)
Tests live Gemini 3.8 Flash model invocation and memory package grounding:
```bash
# 1. Test live Gemini connection with exponential backoff retry:
.venv\Scripts\python.exe -m app.ai.test_gemini

# 2. Test live Gemini Solver reasoning over retrieved FalkorDB graph lessons:
.venv\Scripts\python.exe -m app.ai.test_propose_workflow
```

---

## 4. Architecture & Public Interface for Backend Integration

> [!TIP]
> For a comprehensive integration guide, sequence diagrams, illustrative API schemas, and error handling patterns, see [docs/BACKEND_INTEGRATION.md](docs/BACKEND_INTEGRATION.md).

The backend service interacts directly with `HiveMindOrchestrator` (`app.ai.orchestrator`):

```python
from app.ai.orchestrator import HiveMindOrchestrator

orchestrator = HiveMindOrchestrator()
```

### Core Public Methods

#### 1. `propose_solution`
```python
result = orchestrator.propose_solution(
    task_description="Database transaction deadlock when creating index during migration",
    category="database_migration",  # optional
    limit=5                         # optional, default 5 (1-10)
)
```
- **Returns**: Dictionary with `task_id`, `proposal_id`, `task_description`, `proposed_fix`, `memories` (retrieved lessons), `memory_count`, `proposal` (structured Pydantic `SolverResponse`), and `verification_status="UNVERIFIED"`.

#### 2. `evaluate_proposal`
```python
eval_result = orchestrator.evaluate_proposal(
    task_id=result["task_id"],
    proposal_id=result["proposal_id"],
    task_description=result["task_description"],
    proposed_fix=result["proposed_fix"],
    test_file="tests/test_migration_fixture.py", # path relative to project root (must be in tests/)
    is_relevant=True,                            # False forces UNVERIFIED status
    test_description="Verify non-blocking index prevents migration deadlocks",
)
```
- **Returns**: Dictionary with `test_execution` (`TestExecutionResult`), `verification` (`VerificationResult`), `verification_status` (`"VERIFIED_SUCCESS"`, `"VERIFIED_FAILURE"`, or `"UNVERIFIED"`), and `evidence` string.

#### 3. `record_verification`
```python
record = orchestrator.record_verification(
    task_description=result["task_description"],
    problem_title="Index creation deadlock",
    category="database_migration",
    proposal=result["proposal"],
    test_result=eval_result["test_execution"],
    lesson_content="When adding indexes under load, build concurrently to prevent table lock deadlocks.",
    test_spec=eval_result["test_specification"],
    task_id=result["task_id"],
    proposal_id=result["proposal_id"],
)
```
- **Returns**: Dictionary with `task_id`, `proposal_id`, `verification_status`, `lesson_saved` (`bool`), `lesson_id` (`str | None`), `outcome_id`.

---

## 5. Verification Integrity & Causal Boundaries

HiveMind enforces strict verification boundaries to prevent false claims:

1. **Test Passing vs. Causal Validation**:
   - A `VERIFIED_SUCCESS` outcome certifies that an explicitly designated test file was executed under controlled conditions and exited with returncode 0.
   - It **does not claim universal correctness or autonomous formal verification** of arbitrary code modifications across unobserved edge cases.
2. **Relevance Enforcement**:
   - A passing test that is not explicitly designated as relevant to the proposal produces `UNVERIFIED`.
   - Smoke tests cannot be used to verify unrelated engineering fixes.
3. **Execution Sandbox**:
   - `TestRunner` executes tests only within the designated `tests/` directory; attempts to target arbitrary scripts outside `tests/` are blocked with `ValueError`.
4. **Lesson Eligibility Gate**:
   - Schema validators (`ExperienceRecord.validate_evidence()`) strictly prohibit creating a lesson from an `UNVERIFIED` outcome or an outcome with empty evidence.
5. **Anti-Hallucination Gate**:
   - `Solver` strictly verifies that any memory IDs cited by the LLM in `memory_ids_used` exist in the retrieved memory package; unknown IDs are rejected.

---

## 6. Graph Persistence Safety & Known Limitations

1. **Multi-Query Cypher Statements**:
   - `GraphMemoryRepository.save_experience()` writes graph entities using individual Cypher queries.
   - *Safety Guarantee*: All statements use idempotent `MERGE` clauses keyed on unique entity IDs. Retrying a write safely completes any missing relations without data corruption or duplicate nodes.
   - *Visibility Guarantee*: Retrieval queries require an inner `MATCH (l:Lesson)-[:SUPPORTED_BY]->(o:Outcome)` with `o.status IN ['VERIFIED_SUCCESS', 'VERIFIED_FAILURE']`. An incomplete write can never expose an unverified or evidence-less lesson in retrieval.
   - *Mitigation for Backend*: Execute writes sequentially per task/proposal rather than dispatching parallel simultaneous writes to the same proposal ID.