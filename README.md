# HiveMind — Evidence-Backed Collective Graph Memory for AI Coding Agents

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black?style=flat-square&logo=three.js)](https://threejs.org)
[![FalkorDB](https://img.shields.io/badge/FalkorDB-Graph_Memory-FF4500?style=flat-square)](https://falkordb.com)
[![Gemini](https://img.shields.io/badge/Google_Gemini-3.8_Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)

HiveMind is an AI-powered collective memory and verification system for coding agents. Unlike conventional LLM coding assistants that operate in an ephemeral loop—forgetting past failures, hallucinating fixes, and repeatedly falling into the same concurrency bugs—HiveMind enforces a complete, empirical learning lifecycle:

> **Retrieve Prior Experience** ➔ **Diagnose & Propose** ➔ **Execute Sandbox Tests** ➔ **Verify Evidence** ➔ **Persist to Graph DAG** ➔ **Reuse on Future Tasks**

The system pairs a **FastAPI backend** and **FalkorDB Graph Database** with an interactive **React 3D Workbench** featuring an animated blue sidebar navigation, 3D WebGL memory topology, agent reasoning timeline, evidence provenance inspector, and cross-task memory transfer demonstration.

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Frontend["HiveMind Frontend (React 18 + Vite 5 + Three.js)"]
        UI_Nav["Collapsible Blue Sidebar<br/>(3-Bar Animated Hamburger)"]
        UI_3D["3D Memory Graph Explorer<br/>(WebGL Neural Topology)"]
        UI_Run["Learning Run Workspace<br/>(7-Stage Reasoning Timeline)"]
        UI_Trust["Evidence & Trust Inspector<br/>(Causal Provenance Chain)"]
        UI_Fail["Failure Intelligence<br/>(Anti-Pattern Negative Knowledge)"]
        UI_Reuse["Memory Reuse Lab<br/>(Task A → Task B Transfer Demo)"]
    end

    subgraph API["FastAPI REST Service (Port 8000)"]
        Router["/api/v1/proposals Router"]
        Endpoints["POST /proposals<br/>POST /proposals/{id}/evaluate<br/>POST /proposals/{id}/persist<br/>GET /proposals/{id}<br/>GET /health"]
        LStore["Canonical Lifecycle Store<br/>(SQLite / PostgreSQL ACID)"]
    end

    subgraph Core["HiveMind Orchestration Engine"]
        Orchestrator["HiveMindOrchestrator"]
        Retriever["MemoryRetriever<br/>(Vector + Cypher Subgraph)"]
        Solver["GeminiSolver<br/>(Gemini 3.8 Flash)"]
        Runner["TestRunner<br/>(Sandboxed Pytest Subprocess)"]
        Verifier["EvidenceVerifier<br/>(Exit Code & Output Analyzer)"]
        Curator["MemoryCurator<br/>(ExperienceRecord Compiler)"]
    end

    subgraph Storage["Databases & Infrastructure"]
        FalkorDB[("FalkorDB Graph Memory<br/>(Redis Protocol :6379)")]
        DiskStorage[("Isolated Tests Sandbox<br/>(tests/*.py)")]
    end

    Frontend -->|Typed Axios / Fetch API| Router
    Router --> Endpoints
    Endpoints --> LStore
    Endpoints --> Orchestrator

    Orchestrator --> Retriever
    Orchestrator --> Solver
    Orchestrator --> Runner
    Orchestrator --> Verifier
    Orchestrator --> Curator

    Retriever <-->|Cypher Queries| FalkorDB
    Curator -->|Causal DAG Commits| FalkorDB
    Runner <-->|Subprocess Execution| DiskStorage
    Solver -->|Google GenAI API| GeminiCloud[("Google Gemini Cloud")]
```

---

## 🗺️ FalkorDB Graph Map & Schema

In HiveMind, memory is not a flat list of text documents or lossy vector embeddings. It is an immutable, causal directed acyclic graph (DAG) in **FalkorDB** containing 8 strongly-typed node classes connected through semantic relationships.

### Graph Topology & Relationships

```mermaid
graph TD
    Task["(:Task)<br/>• id<br/>• description<br/>• created_at"] 
    Problem["(:Problem)<br/>• id<br/>• title<br/>• category<br/>• description"]
    Agent["(:Agent)<br/>• id<br/>• role"]
    Attempt["(:Attempt)<br/>• id<br/>• description<br/>• status<br/>• created_at"]
    Solution["(:Solution)<br/>• id<br/>• description"]
    Failure["(:Failure)<br/>• id<br/>• description<br/>• error_type"]
    Outcome["(:Outcome)<br/>• id<br/>• status: VERIFIED_SUCCESS | VERIFIED_FAILURE<br/>• evidence<br/>• verified_at"]
    Lesson["(:Lesson)<br/>• id<br/>• content<br/>• confidence<br/>• created_at"]

    Task -->|HAS_PROBLEM| Problem
    Problem -->|HAS_ATTEMPT| Attempt
    Agent -->|PERFORMED| Attempt
    Attempt -->|USED_SOLUTION| Solution
    Attempt -->|PRODUCED_FAILURE| Failure
    Attempt -->|PRODUCED_OUTCOME| Outcome
    Lesson -->|APPLIES_TO| Problem
    Lesson -->|SUPPORTED_BY| Outcome
    Failure -.->|SUPPORTS_LESSON| Lesson

    classDef success fill:#ECFDF5,stroke:#059669,stroke-width:2px,color:#065F46;
    classDef failure fill:#FFF1F2,stroke:#E11D48,stroke-width:2px,color:#9F1239;
    classDef lesson fill:#EFF6FF,stroke:#2563EB,stroke-width:2px,color:#1E40AF;
    classDef neutral fill:#F8FAFC,stroke:#64748B,stroke-width:1.5px,color:#334155;

    class Outcome success;
    class Failure failure;
    class Lesson lesson;
    class Task,Problem,Attempt,Agent,Solution neutral;
```

### Node Entity & Property Reference

| Node Label | Key Properties | Role in Memory Lifecycle |
|---|---|---|
| `(:Task)` | `id`, `description`, `created_at` | Root boundary representing the user-requested engineering objective. |
| `(:Problem)` | `id`, `title`, `category`, `description` | Formal domain classification (e.g., `concurrency`, `migrations`, `database`). |
| `(:Agent)` | `id`, `role` | Identity and persona of the executing agent (e.g. `Investigator`, `Solver`). |
| `(:Attempt)` | `id`, `description`, `status`, `created_at` | An empirical attempt containing a generated code patch or strategy. |
| `(:Solution)` | `id`, `description` | The concrete solution payload (patch, configuration, or migration SQL). |
| `(:Failure)` | `id`, `description`, `error_type` | Captured negative evidence (e.g. PostgreSQL `lock_not_available`, error code `54000`). |
| `(:Outcome)` | `id`, `status`, `evidence`, `verified_at` | Deterministic verification result (`VERIFIED_SUCCESS` / `VERIFIED_FAILURE`) with stdout/stderr. |
| `(:Lesson)` | `id`, `content`, `confidence`, `created_at` | High-order engineering heuristic synthesized only from verified empirical outcomes. |

### Semantic Relationships

- `(:Task)-[:HAS_PROBLEM]->(:Problem)`: Scopes the core failure or obstacle to a domain problem.
- `(:Problem)-[:HAS_ATTEMPT]->(:Attempt)`: Links every trial and iteration attempted on this problem.
- `(:Agent)-[:PERFORMED]->(:Attempt)`: Attributes work to the executing agent.
- `(:Attempt)-[:USED_SOLUTION]->(:Solution)`: Records the specific solution patch executed.
- `(:Attempt)-[:PRODUCED_FAILURE]->(:Failure)`: Links to structured failure symptoms and error codes.
- `(:Attempt)-[:PRODUCED_OUTCOME]->(:Outcome)`: Binds to deterministic test runner output and status.
- `(:Lesson)-[:APPLIES_TO]->(:Problem)`: Indexes lessons for cross-task semantic retrieval.
- `(:Lesson)-[:SUPPORTED_BY]->(:Outcome)`: **Integrity guarantee**: Lessons can *only* exist when backed by a verified outcome.
- `(:Failure)-[:SUPPORTS_LESSON]->(:Lesson)`: Links negative knowledge directly to derived prevention rules.

---

### How the Agent Queries FalkorDB

HiveMind's agent subsystem queries FalkorDB at three crucial stages using Cypher:

#### 1. Contextual Experience Retrieval Query
When a new task is submitted, `Investigator` / `MemoryRetriever` queries FalkorDB to find relevant past lessons, positive outcomes, and counter-example failures:

```cypher
MATCH (l:Lesson)-[:APPLIES_TO]->(p:Problem)
MATCH (l)-[:SUPPORTED_BY]->(o:Outcome)
WHERE o.status IN ['VERIFIED_SUCCESS', 'VERIFIED_FAILURE']
OPTIONAL MATCH (a:Attempt)-[:PRODUCED_OUTCOME]->(o)
OPTIONAL MATCH (a)-[:PRODUCED_FAILURE]->(f:Failure)
RETURN DISTINCT
    l.id, l.content, l.confidence,
    p.id, p.title, p.description, p.category,
    o.id, o.status, o.evidence,
    a.id, a.description,
    f.description, f.error_type
```

#### 2. Deep Problem History & Anti-Pattern Traversal Query
When diagnosing recurring regressions, the agent queries the full causal lineage of previous attempts and failures:

```cypher
MATCH (p:Problem {id: $problem_id})-[:HAS_ATTEMPT]->(a:Attempt)
OPTIONAL MATCH (a)-[:PRODUCED_FAILURE]->(f:Failure)
OPTIONAL MATCH (a)-[:PRODUCED_OUTCOME]->(o:Outcome)
RETURN p.id, p.title,
       a.id, a.description, a.status,
       f.id, f.description, f.error_type,
       o.id, o.status, o.evidence
ORDER BY a.created_at ASC
```

#### 3. Causal DAG Mutation Query (Atomic Ingestion)
When tests succeed (or confirm a negative pattern), `MemoryCurator` commits the verified outcome and lesson atomically into FalkorDB without overwriting historical records:

```cypher
MERGE (l:Lesson {id: $lesson_id})
SET l.content = $content,
    l.confidence = $confidence,
    l.created_at = $created_at
WITH l
MATCH (p:Problem {id: $problem_id})
MATCH (o:Outcome {id: $outcome_id})
MERGE (l)-[:APPLIES_TO]->(p)
MERGE (l)-[:SUPPORTED_BY]->(o)
```

---

## 🛡️ How FalkorDB Drives Agent Decisions (The Graph in Action)

FalkorDB is not a passive logging database in HiveMind—**it is the central decision-making engine that dictates every agent action**. Without the graph, an LLM agent operates in an ephemeral vacuum, repeating past deadlocks and hallucinating non-viable fixes. With FalkorDB, the agent acts as an empirical, self-improving reasoning system.

### Graph-Driven Decision Loop

```mermaid
sequenceDiagram
    autonumber
    actor User as User / CI Pipeline
    participant API as FastAPI Orchestrator
    participant FalkorDB as FalkorDB Graph
    participant Solver as Gemini 3.8 Solver
    participant Sandbox as Subprocess TestRunner
    participant Curator as MemoryCurator

    User->>API: Submit Task ("Postgres deadlock on index migration")
    Note over API,FalkorDB: Step 1: Graph Querying & Subgraph Traversal
    API->>FalkorDB: Cypher: Retrieve Lessons & Anti-Patterns for category='database'
    FalkorDB-->>API: Returns Lesson L-88 (CONCURRENT index) & Failure F-12 (lock_not_available)
    
    Note over API,Solver: Step 2: Graph-Conditioned Decision Making
    API->>Solver: Prompt with Task + Grounded Graph Evidence
    Note over Solver: Decision Logic:<br/>1. Prunes failed branch F-12 (Never repeat lock timeout)<br/>2. Adopts validated solution L-88 (CREATE INDEX CONCURRENTLY)<br/>3. Strictly binds memory_ids_used=['L-88']
    Solver-->>API: Returns Grounded Proposal (Cites L-88)
    
    Note over API,Sandbox: Step 3: Sandboxed Empirical Verification
    API->>Sandbox: Execute Isolated Pytest Subprocess
    Sandbox-->>API: Exit Code 0 (Passed, 0 lock contention)
    
    Note over API,FalkorDB: Step 4: Causal Graph Ingestion
    API->>Curator: Compile Causal Experience Record
    Curator->>FalkorDB: Cypher MERGE: Task, Problem, Attempt, Outcome, Lesson
    FalkorDB-->>User: Proposal VERIFIED_SUCCESS + Persisted in Graph Memory
```

### Where the Agent's Decisions Come From the Graph

Every critical decision made by the HiveMind agent originates directly from FalkorDB graph nodes and traversals:

#### 1. Positive Solution Grounding (What To Do)
- **Graph Source**: `(:Lesson)-[:SUPPORTED_BY]->(:Outcome {status: "VERIFIED_SUCCESS"})`
- **Agent Decision**: When FalkorDB returns a verified lesson (e.g., *"When adding a unique index to a high-concurrency PostgreSQL table, use `CREATE UNIQUE INDEX CONCURRENTLY` with statement timeouts"*), the solver agent grounds its `proposed_fix` directly on the verified lesson content and references `memory_ids_used: ["lesson-xxx"]`.
- **Integrity Enforcement**: The solver prompt strictly restricts `memory_ids_used` to lesson IDs retrieved from FalkorDB; inventing or modifying memory IDs is rejected at schema validation.

#### 2. Negative Knowledge Pruning (What NOT To Do)
- **Graph Source**: `(:Attempt)-[:PRODUCED_FAILURE]->(:Failure {error_type: "54000"})`
- **Agent Decision**: Standard LLMs repeatedly attempt naive `ALTER TABLE ADD CONSTRAINT UNIQUE` because it is syntactically concise. FalkorDB contains the negative knowledge showing that this causes an `AccessExclusiveLock` timeout (`54000: lock_not_available`). The agent's decision engine identifies the past failure and **explicitly prunes that strategy** from its search space before generating code.

#### 3. Strict Verification & Anti-Hallucination Integrity
- **Graph Source**: `(:Outcome {evidence: "..."})`
- **Agent Decision**: The agent is structurally prohibited from self-declaring success. An outcome node can only be written to FalkorDB when the sandboxed test runner returns a deterministic exit code (`0` for success, non-zero for failure). The agent's subsequent decisions are thus grounded exclusively in empirical proof rather than LLM confidence.

#### 4. Cross-Task Knowledge Transfer (Task A → Task B)
- **Task A (First Encounter)**: Agent encounters an unindexed migration deadlock. Initial naive solution fails (`VERIFIED_FAILURE` logged). Agent explores alternative, verifies `CONCURRENTLY` via pytest (`VERIFIED_SUCCESS`), and commits `Lesson L-88` to FalkorDB.
- **Task B (Subsequent Similar Task)**: A new task arrives: *"Add unique constraint on customer_email table under heavy production traffic"*.
  - FalkorDB instantly serves `Lesson L-88`.
  - The agent generates the correct non-blocking migration on the **first attempt** with zero failed test cycles.
  - FalkorDB directly saved compute time, prevented database outages, and eliminated human debugging intervention.

---

## Distinctive Workbench Features

### 1. Animated Blue Sidebar Navigation
- **Deep Blue Palette**: Styled with `#1E3A8A` primary navy, `#172554` secondary slate-blue, and `#60A5FA` electric blue highlights.
- **Animated 3-Bar Hamburger**: Smoothly transforms into a close `X` icon on toggle with micro-animations.
- **Dual-Mode Desktop & Mobile**: Collapses into a sleek 72px icon rail on desktop with floating tooltips, and slides over with a backdrop overlay on mobile.
- **Live Infrastructure Telemetry**: Real-time health indicators for FastAPI backend and FalkorDB connectivity.

### 2. Collective Memory Graph Explorer (3D WebGL)
- **Living Memory Topology**: Dark navy 3D canvas featuring a central glowing wireframe core, precessing orbital rings, floating typed nodes, and dynamic particle starfields.
- **Evidence-Based Color Encoding**:
  - <span style="color:#2563EB">●</span> **Blue**: Persistent Lessons & Knowledge Nodes
  - <span style="color:#059669">●</span> **Green**: Verified Success Outcomes (`VERIFIED_SUCCESS`)
  - <span style="color:#E11D48">●</span> **Red**: Verified Failures & Anti-Patterns (`VERIFIED_FAILURE`)
  - <span style="color:#D97706">●</span> **Amber**: Unverified Proposals & Active Tasks (`UNVERIFIED`)
- **HUD Controls**: Interactive drag, inertia damping, camera reset, pause/resume orbit, causal chain highlighting, and cluster filtering.

### 3. Agent Reasoning Timeline (Learning Run Workspace)
Tracks the complete autonomous lifecycle as a 7-stage connected timeline:
1. **Investigation Scoping**: Canonical task parameterization and input boundaries.
2. **Memory Retrieval**: FalkorDB vector and Cypher traversal for relevant historical lessons.
3. **Solution Generation**: Gemini solver diagnostic analysis and patch synthesizer.
4. **Sandboxed Fixture Binding**: Restricting test execution strictly within `tests/`.
5. **Subprocess Pytest Execution**: Isolated pytest subprocess runner capturing stdout/stderr.
6. **Empirical Verification Classification**: Status strictly determined by subprocess exit codes.
7. **Graph Memory Persistence**: Inserting verified nodes into FalkorDB with grounded Cypher queries.

### 4. Evidence & Trust Provenance Inspector
Answers the core engineering question: **"Why should I trust this lesson?"**
- Visualizes the unbroken 5-stage causal provenance chain: `Task → Proposal → Test Execution → Verification Outcome → Persisted Lesson`.
- **Anti-Hallucination Integrity Contract**: Client-side requests cannot manually claim success or alter test evidence; status is derived solely from the backend test runner.

### 5. Failure Intelligence & Negative Knowledge
- Captures counter-examples and failed attempts (e.g., standard blocking index builds triggering PostgreSQL error `54000: lock_not_available`).
- Preserves negative knowledge to prune known-bad solution branches before code is committed.

### 6. Learning Transfer Demonstration (Memory Reuse Lab)
- Side-by-side benchmark demonstrating collective learning:
  - **Task A (Seed Experience)**: Generates a fix for a migration deadlock, runs pytest, and commits `Lesson L-88` to FalkorDB.
  - **Task B (Future Similar Task)**: Submits a related problem, performs live retrieval against FalkorDB, and proves that the newly created proposal is directly informed by Task A's lesson!

---

## Quick Start & Setup

### 1. Prerequisites
- **Python**: 3.11+
- **Node.js**: 18+ & **npm**
- **Docker**: For running FalkorDB and PostgreSQL

### 2. Start Database Services
```bash
# Start FalkorDB on port 6379 and PostgreSQL on port 5433
docker-compose up -d falkordb postgres-test
```

### 3. Backend Setup
```bash
# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables in project-root .env:
# GEMINI_API_KEY=your_key_here
# GEMINI_MODEL=gemini-3.8-flash
# FALKORDB_HOST=localhost
# FALKORDB_PORT=6379

# Run FastAPI backend server (port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify backend health:
```bash
curl http://127.0.0.1:8000/api/v1/health
# {"status":"healthy","service":"HiveMind API","database_connected":true,"version":"1.0.0"}
```

### 4. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server on port 3000
npm run dev -- --host 127.0.0.1 --port 3000
```
Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** in your browser.

---

## Automated Verification & Test Suite

HiveMind features an automated test suite verifying deterministic verification rules, graph integrity, and API lifecycle:

```bash
# Run all 58 backend tests (including SQLite/Postgres lifecycle persistence and API tests)
pytest -v

# Run deterministic learning loop verification demo (zero external API cost)
python app/ai/demo_learning_loop.py

# Test frontend production build
cd frontend && npm run build
```

---

## REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check verifying API and FalkorDB connectivity. |
| `POST` | `/api/v1/proposals` | Submit a task to retrieve memory and generate a fix proposal (`UNVERIFIED`). |
| `POST` | `/api/v1/proposals/{id}/evaluate` | Run an isolated pytest fixture under `tests/` and classify evidence. |
| `POST` | `/api/v1/proposals/{id}/persist` | Ingest verified outcome and reusable lesson into FalkorDB DAG. |
| `GET` | `/api/v1/proposals/{id}` | Retrieve canonical proposal record. |
| `GET` | `/api/v1/proposals/{id}/evaluation` | Retrieve evaluation execution evidence. |
| `GET` | `/api/v1/proposals/{id}/persisted` | Retrieve persisted lesson node metadata. |

---

## Tech Stack Summary

- **Frontend**: React 18, Vite 5, TypeScript, Tailwind CSS, Three.js, Lucide React.
- **Backend**: FastAPI, Uvicorn, Pydantic v2, Python 3.11+.
- **AI Core**: Google GenAI SDK (Gemini 3.8 Flash), Sentence-Transformers Embeddings.
- **Graph Database**: FalkorDB (Cypher Query Language over Redis protocol).
- **Persistence**: SQLite (development) & PostgreSQL (production migration tested).
- **Execution Sandbox**: Subprocess-isolated Pytest TestRunner with strict directory whitelisting.

---

## License

Apache License 2.0. Built for the Google DeepMind & Agentic AI Collective Intelligence Challenge.