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
