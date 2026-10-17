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

$$\text{Retrieve Prior Experience} \longrightarrow \text{Diagnose \& Propose} \longrightarrow \text{Execute Sandbox Tests} \longrightarrow \text{Verify Evidence} \longrightarrow \text{Persist to Graph DAG} \longrightarrow \text{Reuse on Future Tasks}$$

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

## FalkorDB Causal Knowledge Graph Schema

In HiveMind, memory is not a flat list of text documents. It is a directed acyclic graph (DAG) of grounded experiences:

```mermaid
graph LR
    Task["(:Task)<br/>Canonical Task Scoping"] -->|HAS_PROBLEM| Problem["(:Problem)<br/>Symptom & Domain Category"]
    Problem -->|HAS_ATTEMPT| Attempt["(:Attempt)<br/>Generated Code Patch"]
    Attempt -->|PRODUCED_OUTCOME| Outcome["(:Outcome)<br/>Status: VERIFIED_SUCCESS"]
    Attempt -->|PRODUCED_FAILURE| Failure["(:Failure)<br/>Status: VERIFIED_FAILURE"]
    
    Lesson["(:Lesson)<br/>Reusable Engineering Insight"] -->|SUPPORTED_BY| Outcome
    Lesson -->|APPLIES_TO| Problem
    Failure -.->|SUPPORTS_LESSON| Lesson

    classDef success fill:#ECFDF5,stroke:#059669,stroke-width:2px,color:#065F46;
    classDef failure fill:#FFF1F2,stroke:#E11D48,stroke-width:2px,color:#9F1239;
    classDef lesson fill:#EFF6FF,stroke:#2563EB,stroke-width:2px,color:#1E40AF;
    classDef neutral fill:#F8FAFC,stroke:#64748B,stroke-width:1px,color:#334155;

    class Outcome success;
    class Failure failure;
    class Lesson lesson;
    class Task,Problem,Attempt neutral;
```

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

Interactive OpenAPI documentation is available at **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.

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