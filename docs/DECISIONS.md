# Architectural Decisions Record (ADR) - VoxInsight

This file documents the key technical and design decisions for VoxInsight to provide context and prevent future agent sessions from repeatedly reconsidering architecture.

---

## Decision Status Legend
- **ACCEPTED (Planned)**: The decision is agreed upon and scheduled for execution in a future phase.
- **IMPLEMENTED**: The design choice has been coded and verified.
- **SUPERSEDED**: The decision has been replaced by a newer ADR.

---

## 1. FastAPI over Flask or Django

* **Decision**: Use FastAPI as the core Python backend web framework.
* **Reason**: FastAPI provides automatic API documentation (Swagger/OpenAPI), native support for asynchronous requests (`async/await`), high performance comparable to Node.js/Go, and native request validation via Pydantic. Flask lacks built-in async and validation; Django is too heavy and opinionated, whereas FastAPI is ideal for building lightweight, modular REST APIs alongside heavy NLP compute blocks.
* **Date**: 2026-08-13
* **Status**: IMPLEMENTED (Phase 1)

---

## 2. PostgreSQL as Primary Relational Database

* **Decision**: Use PostgreSQL for structured relational data.
* **Reason**: Relational data structures are necessary for tracking Users, Workspaces, Datasets, Feedback, and analysis records with strict relational integrity, foreign key constraints, and robust ACID properties. PostgreSQL is chosen for its scalability, rich JSONB features, and seamless integration with Python via SQLAlchemy and Alembic.
* **Date**: 2026-08-13
* **Status**: IMPLEMENTED/CONFIGURED (Phase 1). Runtime integration verification remains pending because Docker is unavailable in the current environment.

---

## 3. FAISS for Vector Retrieval

* **Decision**: Use FAISS (Facebook AI Similarity Search) as the vector retrieval engine, decoupled from PostgreSQL.
* **Reason**: FAISS is a highly optimized library for efficient similarity search and clustering of dense vectors. Since we are dealing with high-dimensional embeddings from XLM-RoBERTa, FAISS allows extremely fast Top-K retrieval. By maintaining the FAISS index files on disk/memory separately (rather than using pgvector in PostgreSQL), we keep the database lightweight and modular, easily mapping vector index offsets back to feedback record IDs in PostgreSQL.
* **Date**: 2026-08-13
* **Status**: ACCEPTED (Planned - Phase 4)

---

## 4. XLM-RoBERTa (XLM-R) as the Intended Multilingual NLP Backbone

* **Decision**: Utilize XLM-RoBERTa (`xlm-roberta-base` or custom fine-tuned variations) for the core multilingual and code-mixed (Hinglish/English-Hindi) NLP pipeline.
* **Reason**: VoxInsight must analyze Hindi, English, and Hinglish. XLM-RoBERTa is pre-trained on a massive multilingual corpus (100 languages) and has demonstrated state-of-the-art results on cross-lingual tasks, sequence classification, and token classification for code-mixed languages. It handles script variation (Devanagari vs. Romanized Latin scripts) much better than monolingual English models or standard multilingual models.
* **Date**: 2026-08-13
* **Status**: ACCEPTED (Planned - Phase 3)

---

## 5. Next.js + TypeScript + Tailwind CSS Frontend

* **Decision**: Build the web-based analytics dashboard using Next.js (App Router), TypeScript, and Tailwind CSS.
* **Reason**: Next.js provides modern React utilities (server components, routing, optimized rendering), TypeScript enforces compile-time type safety for complex analytical data representations, and Tailwind CSS allows rapid, responsive, and beautiful styling aligned with premium design guidelines.
* **Date**: 2026-08-13
* **Status**: IMPLEMENTED (Phase 1)

---

## 6. REST API between Frontend and Backend

* **Decision**: Enforce standard REST endpoints using JSON payloads for communication between Next.js and FastAPI.
* **Reason**: Keeps a strict separation of concerns between client and server. It allows the backend to be independently testable via standard REST clients (and API schemas), simplifies mock testing, and ensures that the frontend never directly executes database operations or NLP computations.
* **Date**: 2026-08-13
* **Status**: IMPLEMENTED (Phase 1)

---

## 7. Modular NLP Architecture

* **Decision**: Structure the NLP processing pipeline as discrete, pluggable modules (Preprocessing, Language ID, Sentiment, ABSA, Emotion, Classification) rather than a single monolithic block.
* **Reason**: This allows testing each pipeline segment independently. Furthermore, if a single model needs to be swapped out for a different LLM or fine-tuned transformer in the future, the change remains isolated to that specific module interface.
* **Date**: 2026-08-13
* **Status**: ACCEPTED (Planned - Phase 3)

---

## 8. Workspace-isolated CSV ingestion

* **Decision**: Store datasets and feedback in PostgreSQL with a workspace foreign key on both records, enforcing membership checks in every data API route.
* **Reason**: Keeping the workspace boundary directly on feedback prevents cross-tenant access when identifiers are guessed and provides a stable data foundation before NLP processing begins. CSV imports preserve duplicate source rows and report invalid rows rather than silently changing customer data.
* **Date**: 2026-08-13
* **Status**: IMPLEMENTED (Phase 2)

---

## 9. Dataset-scoped FAISS indexes with PostgreSQL metadata

* **Decision**: Persist one FAISS `IndexFlatIP` index per workspace/dataset, with a JSON positional mapping beside it and a `vector_indexes` PostgreSQL metadata table.
* **Reason**: A physically dataset-scoped index prevents accidental cross-workspace candidate retrieval and supports reliable rebuilds. The mapping contains only vector-position-to-Feedback UUID information; PostgreSQL remains authoritative for feedback, dataset, and authorization metadata. Unit-normalized embeddings make `IndexFlatIP` scores cosine similarities.
* **Date**: 2026-08-30
* **Status**: IMPLEMENTED (Phase 4)
## ADR: Phase 5 grounded provider and normalized evidence

`LLMProvider` decouples RAG from vendor SDKs. OpenAI Chat Completions using `gpt-4o-mini` is the primary configured provider because it is a practical API model; credentials are only environment variables. Conversation, Message, and MessageEvidence are normalized: evidence points to authoritative Feedback instead of copying feedback text. RAG reuses Phase 4 authorized search and persists assistant data only after successful generation.

---

## 10. Deterministic Competitor Matching & SQL-Only Aggregation (Phase 7)

* **Decision**: Implement competitor mention extraction using deterministic regex word-boundary alias matching and execute all competitor aggregation entirely within SQL.
* **Reason**:
  - LLMs or fuzzy extraction introduce latency, cost, and hallucination risks when extracting named competitors that users explicitly configure.
  - Regex with word boundaries `rf"(?<!\w){re.escape(alias)}(?!\w)"` prevents false positive substring matching (e.g., "comp" in "company") while remaining Unicode-aware and case-insensitive.
  - Doing all competitor aggregation (mentions, unique feedback, sentiment distributions, coverage, percentages) directly in SQL avoids materializing large volumes of competitor mentions in Python memory.
  - Denominators for sentiment percentages strictly exclude mentions with NULL sentiment labels, accurately representing sentiment coverage.
* **Date**: 2026-09-04
* **Status**: IMPLEMENTED (Phase 7)

---

## 11. Rule-Based Alert Evaluation with Strict NULL Semantics (Phase 7)

* **Decision**: Implement a synchronous, deterministic alert evaluation service reusing Phase 6 Analytics and Phase 7 Competitor Aggregation, with strict NULL handling.
* **Reason**:
  - Background workers, Celery, and external messaging channels (email, SMS, Webhooks) are out of scope and add operational overhead for this phase.
  - Evaluating alerts on demand via `POST /api/v1/alerts/evaluate` provides immediate feedback in the UI and test suites.
  - Handling unavailable or NULL metrics safely: if a metric cannot be calculated (e.g. 0 feedback records or no competitor mentions), the alert rule must **never** trigger (`triggered = false`). Treating NULL as 0 would cause inverted false positive triggers on operators like `lte`.
* **Date**: 2026-09-04
* **Status**: IMPLEMENTED (Phase 7)

---

## 12. Security Safeguards & CORS Hardening (Phase 8)

* **Decision**: Make CORS origins configurable via `CORS_ORIGINS` settings while enforcing strict upload bounds and structured error envelopes.
* **Reason**:
  - Hardcoded localhost origins in production present cross-origin vulnerabilities when deployed behind public domains.
  - Allowing CSV uploads without file size limits introduces denial-of-service risks through memory exhaustion. A 10MB limit protects server memory while easily accommodating typical feedback exports (~50,000+ rows).
  - Malformed query parameters (e.g. invalid UUIDs in comma-separated dataset IDs) must return structured 422 `AppException` responses rather than unhandled 500 errors to maintain API envelope predictability.
* **Date**: 2026-09-05
* **Status**: IMPLEMENTED (Phase 8)

---

## 13. Full-Stack Containerization Strategy (Phase 8)

* **Decision**: Provide clean, modular Dockerfiles for FastAPI backend and Next.js frontend alongside a unified `docker-compose.yml` with healthchecks and persistent named volumes.
* **Reason**:
  - Avoids heavyweight orchestration (Kubernetes/Helm) while providing a reproducible single-command developer and deployment experience (`docker compose up --build`).
  - Next.js is built via multi-stage alpine container to minimize runtime image size.
  - FAISS index directory and PostgreSQL data directory are mapped to named volumes (`faiss_data`, `pgdata`) ensuring persistent state across container restarts.
* **Date**: 2026-09-05
* **Status**: IMPLEMENTED (Phase 8)
