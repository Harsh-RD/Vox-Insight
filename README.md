# VoxInsight — Multilingual Feedback Intelligence Platform

[![Backend Tests](https://img.shields.io/badge/backend%20tests-118%20passed-brightgreen.svg)](#testing)
[![Frontend](https://img.shields.io/badge/Next.js-16.3%20(Turbopack)-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![FAISS](https://img.shields.io/badge/FAISS-CPU%20Vector%20Search-blue.svg)](https://github.com/facebookresearch/faiss)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

VoxInsight is a production-grade full-stack SaaS platform engineered to ingest, process, and analyze multilingual and code-mixed customer feedback (English, Hindi, and Romanized Hinglish) and transform raw, unstructured comments into actionable business intelligence.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Key Business Capabilities](#2-key-business-capabilities)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Core Features](#5-core-features)
6. [Project Structure](#6-project-structure)
7. [Local Setup & Getting Started](#7-local-setup--getting-started)
8. [Environment Variables](#8-environment-variables)
9. [Database Migrations](#9-database-migrations)
10. [Running Backend & Frontend](#10-running-backend--frontend)
11. [Docker Deployment](#11-docker-deployment)
12. [API Overview](#12-api-overview)
13. [Multilingual NLP Pipeline](#13-multilingual-nlp-pipeline)
14. [Semantic Search & FAISS Retrieval](#14-semantic-search--faiss-retrieval)
15. [RAG AI Business Assistant](#15-rag-ai-business-assistant)
16. [Analytics Engine](#16-analytics-engine)
17. [Competitor Intelligence](#17-competitor-intelligence)
18. [Configurable Business Alerts](#18-configurable-business-alerts)
19. [Testing & Quality Assurance](#19-testing--quality-assurance)
20. [Known Limitations & Current Constraints](#20-known-limitations--current-constraints)

---

## 1. Product Overview

In multilingual consumer markets (particularly India and Southeast Asia), feedback, customer reviews, and support tickets are overwhelmingly written in code-mixed languages—notably **Hinglish** (Hindi vocabulary transcribed using Latin/Roman script). Standard monolingual NLP models and English-centric SaaS tools consistently misclassify sentiment, overlook urgent complaints, and fail to cluster business-critical topics.

**VoxInsight** bridges this gap. It provides a single, cohesive intelligence platform that cleans, transliterates, and classifies multilingual feedback, builds local high-dimensional vector search indexes, and empowers leadership teams to query their data with a grounded, hallucination-resistant AI Business Assistant.

---

## 2. Key Business Capabilities

* **Multilingual & Hinglish Preprocessing**: Automatic script detection (Latin, Devanagari, Mixed) and phonetic/lexical normalization for code-mixed feedback.
* **Aspect-Based Sentiment Analysis (ABSA)**: Identifies fine-grained aspects (e.g., *delivery*, *pricing*, *UI/UX*, *payment gateway*) and attributes sentiment polarity to each mention.
* **Emotion & Complaint Classification**: Pinpoints customer frustration, anger, satisfaction, and categorizes complaints with dedicated confidence scoring.
* **Local Semantic Retrieval**: Dataset-isolated FAISS vector indexes for instant semantic search across millions of feedback records without external vector SaaS lock-in.
* **Grounded RAG Assistant**: Multi-turn conversation assistant with bounded context and explicit evidence citations grounded in actual customer quotes.
* **Competitor Intelligence**: Benchmarks positive, neutral, and negative sentiment against direct competitors mentioned in customer conversations.
* **Configurable Metric Alerts**: Rule-based alert engine supporting comparison operators against sentiment rates, complaint volumes, and aspect satisfaction scores.

---

## 3. Architecture Overview

VoxInsight uses a decoupled, clean-architecture pattern separating presentation, API routing, business domain services, and persistence layers.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend (v16)                          │
│  React 19 • Tailwind CSS • Token Refresh Interceptors • Auth Guards    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON / Cookies
┌───────────────────────────────────▼────────────────────────────────────┐
│                        FastAPI Backend Layer                           │
│  App Factory • Argon2id Auth • Workspace Isolation • Pydantic V2      │
└─────────┬─────────────────────────┬───────────────────────────┬────────┘
          │                         │                           │
┌─────────▼─────────┐    ┌──────────▼───────────┐    ┌──────────▼────────┐
│ PostgreSQL 16 DB  │    │  FAISS Vector Store  │    │ Sentence Transf.  │
│ Alembic Migr.     │    │  IndexFlatIP (Cosine)│    │ Multilingual      │
│ Normalized Models │    │  UUID-Isolated Path  │    │ MiniLM-L12-v2     │
└───────────────────┘    └──────────────────────┘    └───────────────────┘
```

* **Data Isolation**: All queries, vector operations, and analyses are strictly scoped to the user's active `workspace_id`. Cross-tenant data leakage is structurally impossible.
* **No Client Secrets**: API keys, JWT secrets, and external LLM credentials exist only on the backend via environment variables.

---

## 4. Technology Stack

* **Frontend**: Next.js 16.3 (Turbopack), React 19, TypeScript 5, Tailwind CSS 4.
* **Backend**: Python 3.11+, FastAPI 0.115, Pydantic 2, SQLAlchemy 2.0, Alembic 1.13.
* **Database**: PostgreSQL 16 (production) / SQLite in-memory (automated testing).
* **Vector Store & Embeddings**: FAISS (CPU), `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensions).
* **NLP & Models**: XLM-RoBERTa modular heads, regex & lexicon-based Hinglish normalizers.
* **Security & Auth**: Argon2id password hashing, PyJWT access tokens (Bearer), HttpOnly SameSite refresh cookies with server-side session rotation and revocation.

---

## 5. Core Features

| Feature | Description |
|---|---|
| **Multi-Tenant Workspaces** | Default "Personal" workspace created on registration; organization workspaces with role-based member isolation. |
| **Dataset Ingestion** | Ingest CSV feedback files with required `text` and optional `rating`, `source`, `timestamp`, and `language` columns. 10MB upload safeguard. |
| **Multilingual NLP** | Comprehensive text normalization, language ID, sentiment, emotion, ABSA, and complaint detection. |
| **Semantic Search** | High-dimensional dense vector search via FAISS with cosine similarity scoring and stale record elimination. |
| **RAG Business Assistant**| Multi-turn conversation assistant with bounded context windows, prompt-injection defenses, and verifiable evidence citations. |
| **Analytics Dashboard** | Live SQL-aggregated metrics: sentiment distribution, complaint rates, aspect breakdown, and chronological trends. |
| **Competitor Benchmarking**| Deterministic alias matching across feedback to compute share of voice and sentiment comparisons. |
| **Alert Rules Engine** | Define threshold rules (`gt`, `lt`, `gte`, `lte`, `eq`) over complaint rates, sentiment scores, and negative counts. |

---

## 6. Project Structure

```text
Vox-Insight/
├── AGENTS.md                  # Development protocol and architecture guidelines
├── docker-compose.yml         # Production multi-container composition
├── .env.example               # Full environment configuration template
├── README.md                  # This documentation
├── docs/                      # Technical specifications
│   ├── ARCHITECTURE.md        # Detailed subsystem architecture
│   ├── API.md                 # Complete REST API specification
│   ├── DATABASE.md            # Database schemas, models, and migrations
│   ├── NLP_PIPELINE.md        # Preprocessing, transliteration, and NLP heads
│   ├── RAG.md                 # Semantic search and grounded assistant design
│   ├── DECISIONS.md           # Architecture Decision Records (ADRs)
│   └── DEVELOPMENT.md         # Milestone execution and verification log
├── backend/                   # FastAPI Backend
│   ├── Dockerfile             # Container definition for backend
│   ├── pyproject.toml         # Packaging and pytest configuration
│   ├── requirements.txt       # Python dependencies
│   ├── alembic/               # Database migrations 001 through 006
│   └── app/
│       ├── api/v1/            # Versioned API endpoints
│       ├── core/              # Security, exceptions, and auth utilities
│       ├── database/          # SQLAlchemy session and Base metadata
│       ├── models/            # Normalized database entities
│       ├── schemas/           # Pydantic request/response models
│       ├── services/          # Business logic and domain engines
│       ├── embeddings/        # SentenceTransformer singleton and registry
│       ├── vector_store/      # FAISS index persistence and retrieval
│       ├── llm/               # Pluggable OpenAI-compatible LLM provider
│       └── rag/               # Context compiler and prompt-injection defenses
└── frontend/                  # Next.js Frontend
    ├── Dockerfile             # Multi-stage production container definition
    ├── package.json           # Node dependencies and scripts
    └── src/
        ├── app/               # Next.js App Router (dashboard, datasets, search, chat, etc.)
        ├── components/        # Auth guards, provider context, and UI elements
        └── lib/               # Centralized typed API client with 401 token refresh
```

---

## 7. Local Setup & Getting Started

### Prerequisites

* Python 3.10+ (Python 3.11+ recommended)
* Node.js 18+ (Node.js 20+ recommended) and npm
* PostgreSQL 14+ (or Docker for containerized database)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example ../.env
# Edit ../.env to provide your SECRET_KEY and DATABASE_URL
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install
```

---

## 8. Environment Variables

Create a `.env` file in the root directory using `.env.example` as a template:

```ini
# PostgreSQL Connection
DATABASE_URL=postgresql+psycopg://voxinsight:voxinsight_dev@localhost:5432/voxinsight

# Authentication & Security
SECRET_KEY=generate-a-random-64-character-hex-string-for-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
COOKIE_SECURE=false

# CORS Configuration
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# File Upload Safety
MAX_UPLOAD_SIZE_BYTES=10485760

# Semantic Vector Search
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBEDDING_DIMENSION=384
EMBEDDING_BATCH_SIZE=32

# RAG & Grounded Assistant (Optional for live LLM generation)
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=your-openai-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
```

---

## 9. Database Migrations

VoxInsight uses Alembic for declarative, version-controlled database schema management:

```bash
cd backend
# Apply all migrations to the configured database
alembic upgrade head

# Check current revision
alembic current
```

Migration Chain:
1. `001_initial_auth_schema` — Users, Workspaces, Memberships, Refresh Sessions
2. `002_dataset_feedback_ingestion` — Datasets, Feedback records
3. `003_nlp_analysis` — Analysis Results, Aspect Analysis
4. `004_vector_index_metadata` — Vector Index status and lifecycle
5. `005_conversations_rag` — Conversations, Chat Messages
6. `006_competitors_and_alerts` — Competitors, Mentions, Alert Rules

---

## 10. Running Backend & Frontend

### Running Backend Locally

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation will be available at `http://localhost:8000/api/v1/docs`.

### Running Frontend Locally

```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 11. Docker Deployment

VoxInsight includes a comprehensive multi-container composition for one-command deployment:

```bash
# Build and start all services (PostgreSQL, Backend, Frontend)
docker compose up --build
```

Services:
* **`postgres`**: PostgreSQL 16 with healthcheck and persistent volume `pgdata`.
* **`backend`**: FastAPI application running on port `8000`, mounts persistent `faiss_data` volume.
* **`frontend`**: Next.js production build running on port `3000`.

---

## 12. API Overview

All API endpoints are versioned under `/api/v1/` and enforce standardized JSON responses:

* **Health**: `GET /api/v1/health` — Returns application status and database connectivity.
* **Auth**:
  * `POST /api/v1/auth/register` — Creates user, Personal workspace, returns JWT.
  * `POST /api/v1/auth/login` — Verifies Argon2id hash, issues access token & HttpOnly refresh cookie.
  * `POST /api/v1/auth/refresh` — Rotates refresh token session, issues new access token.
  * `POST /api/v1/auth/logout` — Revokes server-side refresh session and clears cookie.
* **Workspaces**: `GET /api/v1/workspaces`, `POST /api/v1/workspaces` — Manage isolated tenant workspaces.
* **Datasets**:
  * `POST /api/v1/datasets` — Create dataset record.
  * `POST /api/v1/datasets/{id}/upload` — Stream and parse CSV feedback.
  * `POST /api/v1/datasets/{id}/analyze` — Trigger NLP processing batch.
  * `POST /api/v1/datasets/{id}/index` — Build FAISS semantic vector index.
* **Semantic Search**: `POST /api/v1/search` — Query workspace feedback using natural language.
* **Conversations (RAG)**: `POST /api/v1/conversations/{id}/messages` — Query grounded business assistant.
* **Analytics**: `GET /api/v1/analytics/overview`, `/sentiment`, `/aspects`, `/emotions`, `/complaints`, `/trends`.
* **Competitors**: `GET /api/v1/competitors`, `POST /api/v1/competitors/analyze-dataset`.
* **Alerts**: `GET /api/v1/alerts`, `POST /api/v1/alerts`, `POST /api/v1/alerts/evaluate`.

---

## 13. Multilingual NLP Pipeline

The pipeline handles complex Indian English, Hindi, and code-mixed Hinglish:
1. **Preprocessing & Transliteration**: Identifies scripts, normalizes colloquial Hindi spellings (e.g., *bohot*, *kharab*, *achha*), and standardizes punctuation.
2. **Language Identification**: Categorizes text into `en`, `hi`, `hinglish`, or `other` with confidence scores.
3. **Sentiment Polarity**: Multi-lingual transformer score normalized from `-1.0` (negative) to `+1.0` (positive).
4. **Aspect Extraction**: Pinpoints mentioned domain aspects and tags individual sentiment scores per aspect.
5. **Emotion & Complaint Detection**: Classifies emotion (`joy`, `anger`, `sadness`, `neutral`) and applies binary complaint classification.

---

## 14. Semantic Search & FAISS Retrieval

* **Vector Engine**: Facebook AI Similarity Search (FAISS) `IndexFlatIP`.
* **Embedding Model**: `paraphrase-multilingual-MiniLM-L12-v2` producing 384-dimensional unit-normalized embeddings.
* **Cosine Equivalence**: Inner Product on unit-normalized vectors directly evaluates cosine similarity.
* **Isolation**: Persisted under `backend/data/faiss/<workspace_id>/<dataset_id>/`.
* **Integrity Guard**: Resolves results against live database feedback IDs, guaranteeing that deleted or cross-workspace feedback never surfaces.

---

## 15. RAG AI Business Assistant

* **Context Compilation**: Top-K retrieved vector passages are bounded by strict character caps (12,000 chars) and similarity thresholds (`>= 0.20`).
* **Prompt Injection Defense**: Input questions are sanitized, framed within delimiter boundaries, and system prompts explicitly forbid escaping context boundaries.
* **Verifiable Evidence**: Every assistant response is accompanied by structured evidence objects containing the exact feedback snippet and similarity score.
* **Pluggable Architecture**: Implements an abstract `LLMProvider` interface; default implementation supports OpenAI and compatible APIs (`gpt-4o-mini`).

---

## 16. Analytics Engine

Provides pure SQL-aggregated business metrics without frontend guesswork:
* **Coverage**: Total feedback vs. analyzed records.
* **Sentiment Breakdown**: Proportions of positive, neutral, and negative customer sentiment.
* **Aspect Matrix**: Mention volume and average sentiment for top product aspects.
* **Chronological Trends**: Time-series grouping of sentiment trajectories.
* **Complaint Rates**: Ratio of flagged complaints against total feedback.

---

## 17. Competitor Intelligence

* **Detection Mechanism**: Deterministic name and alias matching across feedback text (e.g., matching "GPay" or "Google Pay" for competitor Google Pay).
* **Metrics**: Mentions volume, share of voice within dataset, and sentiment polarity distribution compared against workspace baseline.

---

## 18. Configurable Business Alerts

* **Metric Coverage**: Monitors `complaint_rate`, `negative_sentiment_rate`, `average_rating`, and `total_complaints`.
* **Operators**: `gt` (>), `gte` (>=), `lt` (<), `lte` (<=), `eq` (==).
* **Evaluation**: Evaluates current metric against threshold and marks alerts as `triggered` or `ok` with recorded trigger values.

---

## 19. Testing & Quality Assurance

VoxInsight maintains rigorous test coverage across backend domain logic, API security, and frontend type safety.

```bash
# Run backend pytest suite
cd backend
pytest

# Results:
# ============================ 118 passed in 44.80s =============================
```

```bash
# Frontend validation
cd frontend
npx tsc --noEmit     # TypeScript typecheck
npm run lint         # ESLint check
npm run build        # Production Next.js build
```

Backend Test Suites:
* `test_auth.py` — Registration, Argon2id verification, JWT issuance, refresh rotation, revocation.
* `test_workspaces.py` — Workspace membership, personal workspace creation, isolation.
* `test_datasets.py` — Dataset creation, CSV upload, row parsing, error handling.
* `test_nlp_phase3.py` — NLP pipeline, preprocessing, sentiment, aspect analysis, emotion, complaints.
* `test_semantic_retrieval.py` — FAISS index creation, unit normalization, search scoring.
* `test_rag.py` — Context compilation, prompt injection defense, mock LLM provider.
* `test_analytics.py` — Aggregation correctness, zero-data safety, NULL handling.
* `test_competitors.py` — Alias matching, mention extraction, benchmarking.
* `test_alerts.py` — Alert rule evaluation, operator checks, state persistence.
* `test_phase8_hardening.py` — Upload size limits, 422 error envelopes, CORS origin parsing.

---

## 20. Known Limitations & Current Constraints

To maintain absolute transparency:

1. **Competitor Detection**: Detection currently uses deterministic name and alias keyword matching. Fuzzy/semantic competitor resolution is not implemented.
2. **Alert Triggering & Notifications**: Alert evaluation is currently executed **on-demand** via the API/UI. Continuous cron evaluation and external dispatch (email, Slack, Webhooks) are not implemented.
3. **PostgreSQL Runtime Verification**: The local test suite runs against SQLite in-memory with full schema emulation. Because Docker is not installed in the Windows test host environment, live PostgreSQL runtime verification is formally **PENDING**.
4. **LLM Provider Configuration**: Live assistant answers require setting a valid `LLM_API_KEY` in `.env`. If unconfigured, the assistant gracefully informs the user that the AI provider is unavailable.

---

## License

This project is licensed under the MIT License.
