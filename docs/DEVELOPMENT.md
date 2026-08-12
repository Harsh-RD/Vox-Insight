# Project Development Log - VoxInsight

This document is the persistent development-state record for the VoxInsight platform. It serves as the primary status dashboard and handover context for future AI coding agents.

> [!IMPORTANT]
> This file must be updated after every major development milestone. Never mark a milestone or task as completed unless it has been fully implemented and verified.

---

## Current Status

* **Current Phase**: Phase 2 — Feedback/data ingestion
* **Current Milestone**: Workspace-isolated dataset and CSV feedback ingestion
* **Status**: Implemented (PostgreSQL runtime verification pending)
* **Last Verified**: 2026-08-13 (24 backend tests; frontend type, lint, and production build checks)

---

## State Breakdown

### Completed
- [x] Git repository created and initialized.
- [x] Persistent AI agent instruction manual established (`AGENTS.md`).
- [x] FastAPI application foundation with versioned health, auth, and workspace routes.
- [x] SQLAlchemy models and Alembic migration for users, workspaces, memberships, and refresh sessions.
- [x] Argon2id password hashing, typed JWT access/refresh tokens, server-side refresh-session rotation and revocation.
- [x] Automatic Personal workspace creation during registration and workspace membership enforcement.
- [x] Next.js + TypeScript + Tailwind frontend foundation with login, registration, session restoration, protected dashboard, and logout.
- [x] Backend SQLite unit tests covering health, authentication, refresh rotation/revocation, and workspaces.
- [x] Dataset and Feedback SQLAlchemy models plus additive Alembic migration `002_dataset_feedback_ingestion`.
- [x] Workspace-member-only dataset creation, listing, retrieval, deletion, feedback retrieval, and UUID-guessing protection.
- [x] CSV ingestion with required `text`, optional rating/source/timestamp/language, row validation, duplicate preservation, import summaries, and pending NLP status.
- [x] Dataset management pages for creation, CSV upload, deletion, and feedback preview.

### In Progress
- [/] PostgreSQL runtime migration and connectivity verification using Docker Compose.

### Blocked
- PostgreSQL runtime verification — Docker is unavailable in the current environment.

### Known Issues
- Backend unit tests use SQLite in memory; they do not verify PostgreSQL-specific runtime behavior.
- Access and refresh tokens are deliberately not persisted in browser storage; a page load restores access through the httpOnly refresh cookie.

---

## Roadmap & Next Steps

### Next Task
Verify migrations `001` and `002` against a running PostgreSQL container. Then begin Phase 3 multilingual preprocessing/NLP only after PostgreSQL verification is recorded.

### Future Development Phases
- **Phase 0**: Repository and architecture foundation
- **Phase 1**: Application foundation, PostgreSQL, and authentication
- **Phase 2**: Dataset and feedback ingestion
- **Phase 3**: Multilingual preprocessing and NLP pipeline
- **Phase 4**: Embeddings and FAISS semantic retrieval
- **Phase 5**: RAG and AI Assistant
- **Phase 6**: Analytics dashboard
- **Phase 7**: Competitor analysis and alerts
- **Phase 8**: Testing, security, deployment, and production hardening
