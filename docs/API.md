# REST API Documentation - VoxInsight

This document specifies the planned REST API interface for VoxInsight. The API communicates via JSON request and response bodies.

> [!IMPORTANT]
> **Status**: PLANNED. No endpoints or routers are implemented in this phase. The following schema represents the intended structure for the application backend services starting in Phase 1.

---

## 1. General API Conventions

### 1.1 Base URL
All API endpoints are versioned and start with the prefix:
```
https://<domain>/api/v1
```

### 1.2 Authentication
Authentication is stateless and uses JWT tokens. Protected routes require the following header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### 1.3 Response Formats
Standard successful responses return clean JSON payloads:
```json
{
  "success": true,
  "data": {}
}
```

Standard error payloads utilize consistent structure:
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "The provided credentials are invalid.",
    "details": {}
  }
}
```

---

## 2. Planned API Route Index

### 2.1 Auth Module (`/api/v1/auth`)
Handles secure registration, logins, token refresh cycles, and logout.

* **POST `/auth/register`**
  - Description: Create a new user account.
  - Payload: `{ "email": "user@example.com", "password": "securepassword", "name": "John Doe" }`
* **POST `/auth/login`**
  - Description: Validate credentials and return tokens.
  - Payload: `{ "email": "user@example.com", "password": "securepassword" }`
  - Response: `{ "access_token": "...", "refresh_token": "...", "token_type": "bearer" }`
* **POST `/auth/refresh`**
  - Description: Renew an expired access token using a refresh token.
* **POST `/auth/logout`**
  - Description: Invalidate the current session token.

### 2.2 Users Module (`/api/v1/users`)
Profile management and settings under active workspace boundaries.

* **GET `/users/me`**
  - Description: Retrieve the currently logged-in user profile.
* **PUT `/users/me`**
  - Description: Update profile metadata (name, settings).

### 2.3 Datasets Module (`/api/v1/datasets`)
CRUD operations for dataset metadata, file upload endpoints, and ingestion status.

* **GET `/datasets`**
  - Description: List all datasets associated with the current workspace.
* **POST `/datasets`**
  - Description: Create a new dataset placeholder.
* **POST `/datasets/{dataset_id}/upload`**
  - Description: Upload feedback files (CSV/JSON/TXT) for ingestion.
  - Content-Type: `multipart/form-data`
* **GET `/datasets/{dataset_id}/status`**
  - Description: Check processing status (e.g., number of processed vs pending rows).

### 2.4 Feedback Module (`/api/v1/feedback`)
Feedback logs and metadata filtering.

* **GET `/feedback`**
  - Description: List feedbacks with pagination and filters (by dataset, language, rating).
* **POST `/feedback`**
  - Description: Submit a single feedback text entry directly.
* **DELETE `/feedback/{feedback_id}`**
  - Description: Remove feedback records and sync deletion with FAISS.

### 2.5 Analysis Module (`/api/v1/analysis`)
NLP result inspections.

* **GET `/analysis/{feedback_id}`**
  - Description: Fetch detailed NLP results (sentiment, aspects, emotion, complaints).
* **POST `/analysis/trigger`**
  - Description: Manually trigger model analysis execution on an un-analyzed feedback batch.

### 2.6 Dashboard Module (`/api/v1/dashboard`)
Analytical aggregations consuming real database summaries.

* **GET `/dashboard/summary`**
  - Description: Get top-level metrics (total feedback, average sentiment, language distribution).
* **GET `/dashboard/trends`**
  - Description: Fetch historical sentiment scores grouped by day/week/month.
* **GET `/dashboard/aspects`**
  - Description: Retrieve identified aspects, frequencies, and aspect sentiments.

### 2.7 Search Module (`/api/v1/search`)
Semantic search endpoint querying FAISS.

* **POST `/search/semantic`**
  - Description: Submit natural language query to retrieve matching feedback context.
  - Payload: `{ "query": "long login time", "limit": 10 }`
  - Response: List of feedback items matching target query with vector distance scores.

### 2.8 Chat Module (`/api/v1/chat`)
RAG dialogue endpoints.

* **GET `/chat/conversations`**
  - Description: List historical conversation histories for the active workspace.
* **POST `/chat/conversations`**
  - Description: Initialize a new conversational assistant chat thread.
* **POST `/chat/conversations/{conversation_id}/messages`**
  - Description: Submit user query to the RAG assistant, stream response, and return text and retrieved feedback references.
  - Payload: `{ "content": "Why are customers complaining about mobile login speed?" }`

### 2.9 Alerts Module (`/api/v1/alerts`)
Alert metrics rules.

* **GET `/alerts`**
  - Description: Get workspace alerts.
* **POST `/alerts`**
  - Description: Create alert thresholds.
* **GET `/alerts/triggered`**
  - Description: Fetch log of historically triggered alerts.

### 2.10 Competitors Module (`/api/v1/competitors`)
Competitor analytics ingest.

* **GET `/competitors`**
  - Description: Retrieve comparison scores for competitor reviews against owned datasets.
* **POST `/competitors/upload`**
  - Description: Ingest competitor feedback dataset files.
