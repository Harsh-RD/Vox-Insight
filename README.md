# VoxInsight — Multilingual Feedback Intelligence Platform

VoxInsight is a full-stack SaaS platform designed to ingest, process, and analyze multilingual and code-mixed customer feedback (such as English, Hindi, and Romanized Hinglish) and translate it into actionable business intelligence.

> [!IMPORTANT]
> **Project Status**: Phase 4 — Semantic embeddings and FAISS retrieval.
> Workspace-isolated datasets, NLP analysis, persistent semantic retrieval, and the minimal search UI are implemented. PostgreSQL runtime integration verification remains pending because Docker is unavailable in the current environment.

---

## 1. The Problem

In multilingual regions (such as India), customer reviews, feedback, and support tickets are frequently written using code-mixed text (e.g., Hinglish—Hindi vocabulary written in the Roman/Latin script). Standard off-the-shelf NLP systems and monolingual sentiment models fail on these inputs. They miss key sentiments, misclassify complaints, cannot resolve aspect-based mentions, and fail to perform accurate semantic searches, leaving valuable user feedback unanalyzed.

## 2. Proposed Solution

VoxInsight solves this by offering a specialized full-stack platform:
1. **Next.js & TypeScript Dashboard**: A premium, responsive interface displaying aggregated customer sentiment, emotion trends, and aspect clouds.
2. **FastAPI Backend**: A lightweight, high-performance API service handling workspace management, secure authentication, ingestion queues, and chat sessions.
3. **Multilingual NLP Pipeline**: A custom pipeline powered by **XLM-RoBERTa** pre-trained models to handle language identification, clean Romanized script spelling, and classify sentiment, aspect-specific scores, emotions, and complaint flags.
4. **FAISS Vector Retrieval & RAG**: A search index that matches natural language business queries against feedback vector representations, passing context to LLMs to generate grounded responses and citations.

---

## 3. Key Capabilities (Planned)

* **Multilingual Ingestion**: Import feedback from files (CSV, JSON) or direct API hooks.
* **Transliteration & Preprocessing**: Clean noise and normalize Romanized Hindi (Hinglish) script variations.
* **Multilingual Sentiment & Emotion**: Compute sentence sentiment polarity and detect emotional classes (anger, joy, sadness, fear).
* **Aspect-Based Sentiment Analysis (ABSA)**: Identify specific product/service aspects (e.g., "billing", "app speed") and associate sentiment with each aspect.
* **Complaint Classification**: Distinguish complaints from general comments.
* **Semantic Search**: Run natural language queries using a local high-dimensional FAISS index.
* **RAG AI Business Assistant**: Interact with an AI assistant that answers business questions grounded in feedback logs, providing document citations.
* **Competitor Comparison**: Compare sentiment profile metrics between your product and competitors.
* **Alerting Engine**: Trigger alerts when metrics fall below thresholds (e.g., negative Hinglish feedback on payment issues surges >15%).
* **Multi-Workspace Auth**: Secure logins and isolated workspaces separating organization data.

---

## 4. Planned Technology Stack

* **Frontend**: Next.js, TypeScript, Tailwind CSS
* **Backend**: Python, FastAPI, Pydantic, SQLAlchemy, Alembic
* **Database**: PostgreSQL
* **Vector & ML**: XLM-RoBERTa (NLP Backbone), FAISS (Vector Index), Pluggable LLM Provider API

---

## 5. Repository Structure

```text
voxinsight/
│
├── AGENTS.md                 # Persistent developer instruction guide for AI agents
├── README.md                 # Project landing page and overview
│
└── docs/                     # Persistent architectural and development specifications
    ├── ARCHITECTURE.md       # Full-stack architecture, tiers, and data flows
    ├── DATABASE.md           # Database tables, models, relationships, and vector plans
    ├── API.md                # REST API endpoints, payload schemas, and auth conventions
    ├── NLP_PIPELINE.md       # Preprocessing, tokenization, and multi-task model heads
    ├── RAG.md                # Vector search, context compiling, and grounded generation
    ├── DEVELOPMENT.md        # State log tracking tasks, milestones, and issues
    └── DECISIONS.md          # Architectural Decision Records (ADR)
```

---

## 6. Development Roadmap

- **Phase 0**: Repository and architecture foundation *(completed)*
- **Phase 1**: Application foundation, PostgreSQL, and authentication *(completed; PostgreSQL runtime verification pending)*
- **Phase 2**: Dataset and feedback ingestion *(implemented; PostgreSQL runtime verification pending)*
- **Phase 3**: Multilingual preprocessing and NLP pipeline *(completed)*
- **Phase 4**: Embeddings and FAISS semantic retrieval *(implemented; PostgreSQL runtime verification pending)*
- **Phase 5**: RAG and AI Assistant *(implemented; live LLM verification pending)*
- **Phase 6**: Analytics dashboard
- **Phase 7**: Competitor analysis and alerts
- **Phase 8**: Testing, security, deployment, and production hardening

---

## Phase 4: Semantic retrieval

Phase 4 adds local semantic feedback retrieval, not RAG or answer generation. Feedback is embedded with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensions) using lazy, CPU-only singleton loading and batch encoding. Vectors are unit-normalized and stored in FAISS `IndexFlatIP` indexes, where inner product is cosine similarity.

Each dataset has its own index below `backend/data/faiss/<workspace UUID>/<dataset UUID>/`. A persistent JSON mapping translates FAISS positions to Feedback UUIDs; PostgreSQL remains the source of text and business metadata. Search authorizes workspace membership before any index is selected and resolves results from authorized database rows, so stale/deleted feedback is never returned. Generated indexes and model assets are ignored by Git.
## Phase 5: Grounded business assistant

Implemented: workspace-authorized RAG conversations, evidence citations, a bounded prompt-injection-resistant context builder, a replaceable OpenAI-compatible `gpt-4o-mini` provider, and a minimal `/chat` interface. It reuses Phase 4 semantic retrieval. Live provider verification remains pending.
