# AI Agent Developer Guide - VoxInsight

Welcome to VoxInsight. This document is a persistent instruction manual for AI coding agents working on this repository. You must read and strictly adhere to the guidelines, architecture principles, and workflows defined in this document.

---

## 1. Project Overview

* **Name**: VoxInsight (VoxInsight — Multilingual Feedback Intelligence Platform)
* **Purpose**: A full-stack SaaS platform that analyzes multilingual and code-mixed customer feedback (English, Hindi, Hinglish) and converts it into actionable business intelligence.
* **Capabilities**: Multilingual Sentiment Analysis, Aspect-Based Sentiment Analysis (ABSA), Emotion Detection, Complaint Classification, Trend Detection, Semantic Search, FAISS Retrieval, Retrieval-Augmented Generation (RAG) with AI Business Assistant, Competitor Comparison, Alerts, and Multi-workspace/user Analytics.

---

## 2. Technology Stack

* **Frontend**: Next.js, TypeScript, Tailwind CSS
* **Backend**: Python, FastAPI, Pydantic, SQLAlchemy, Alembic
* **Database**: PostgreSQL
* **AI/NLP**: Transformer-based NLP (XLM-RoBERTa as intended multilingual backbone), custom embeddings, FAISS vector index, pluggable LLM provider for RAG.

---

## 3. Important Architectural Principles

1. **VoxInsight is a real full-stack application**: Do not build mock frontends that pretend to have a backend.
2. **Never replace backend functionality with frontend mockups**: All analytical, NLP, and database operations must be executed in the Python/FastAPI backend.
3. **Never hardcode fake analytics**: The dashboard must ingest and represent real computed/aggregated data from the database.
4. **Never pretend an AI/NLP result was generated when it was not**: Ensure model outputs are fully generated and parsed.
5. **Never hardcode API keys or secrets**: Use environment variables for all secrets, credentials, and API keys.
6. **Use environment variables for secrets**: Configure access keys, database URLs, and external API endpoints dynamically.
7. **Keep frontend and backend separated**: Maintain clean API boundaries. The frontend is a consumer of backend APIs.
8. **Keep NLP components modular and replaceable**: Standardize model interfaces so NLP modules can be swapped or upgraded independently.
9. **Keep database logic separate from API routes**: Utilize service or repository patterns; keep FastAPI route handlers thin.
10. **Keep business logic separate from UI**: Ensure state management and visual presentation are decoupled in the frontend.
11. **Prefer small, testable modules**: Write modular, clean, and testable code with high unit test coverage.
12. **Do not make major architectural changes without documenting them**: Architectural revisions must be logged in `docs/DECISIONS.md`.
13. **Preserve working functionality when adding features**: Always run existing regression tests to verify that no functional regressions occur.
14. **Run tests/build checks after significant changes**: Make sure tests pass and builds succeed before completing tasks.
15. **Update DEVELOPMENT.md after each major milestone**: Log the progress, updated status, and next tasks in the state tracker.

---

## 4. Operational Rules for AI Agents

> [!IMPORTANT]
> **Inspection Before Modification**
> Before modifying or implementing any feature, inspect the existing code and documentation (`docs/`) first. Do not assume a feature is missing or unimplemented simply because the current chat conversation does not mention it. Check the file system and read `docs/DEVELOPMENT.md` to establish current state.

> [!WARNING]
> **No Fake Completion**
> Never mark a feature or task as completed in `docs/DEVELOPMENT.md` or report it as such to the user unless it actually works and has been verified (via manual or automated testing).

### Pre-Coding Protocol
1. Read [DEVELOPMENT.md](file:///c:/Users/admin/.antigravity-ide/Vox-Insight/docs/DEVELOPMENT.md) to check the current project phase, next task, and last verified state.
2. Search the repository and review files relevant to the task.
3. Read relevant system documentation under `docs/` (e.g., [ARCHITECTURE.md](file:///c:/Users/admin/.antigravity-ide/Vox-Insight/docs/ARCHITECTURE.md), [DATABASE.md](file:///c:/Users/admin/.antigravity-ide/Vox-Insight/docs/DATABASE.md), [API.md](file:///c:/Users/admin/.antigravity-ide/Vox-Insight/docs/API.md), [NLP_PIPELINE.md](file:///c:/Users/admin/.antigravity-ide/Vox-Insight/docs/NLP_PIPELINE.md), [RAG.md](file:///c:/Users/admin/.antigravity-ide/Vox-Insight/docs/RAG.md), [DECISIONS.md](file:///c:/Users/admin/.antigravity-ide/Vox-Insight/docs/DECISIONS.md)) to avoid design divergence.

### Execution Protocol
1. Make modular, well-documented changes.
2. Keep codebase changes confined to the current phase goals unless instructed otherwise.
3. Keep database schemas normalized and index vector metadata correctly, keeping high-dimensional vectors in FAISS.
4. Ensure error handling is robust (e.g., fallback models, try-catch blocks for external API calls, HTTP error responses).

### Post-Coding Protocol
1. Run automated test suites (pytest for backend, jest/vitest/playwright for frontend).
2. Manually verify functionality.
3. Update [DEVELOPMENT.md](file:///c:/Users/admin/.antigravity-ide/Vox-Insight/docs/DEVELOPMENT.md) with updated completion details, new known issues, and next tasks.
