# REST API Documentation - VoxInsight

This document specifies the planned REST API interface for VoxInsight. The API communicates via JSON request and response bodies.

> [!IMPORTANT]
> **Status**: Phase 1 authentication/workspace routes and Phase 2 dataset/feedback ingestion routes are implemented. Later modules below are planned for subsequent phases.

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

Implemented behavior: registration automatically creates a Personal workspace; login and registration return a short-lived access token and set an httpOnly refresh cookie. Refresh tokens are rotated on `/auth/refresh` and revoked on `/auth/logout`. `GET /auth/me` returns the authenticated user and workspace memberships.

### 2.1a Workspace Module (`/api/v1/workspaces`)
* **GET `/workspaces`** — List authenticated user's workspaces.
* **POST `/workspaces`** — Create a workspace owned by the authenticated user.
* **GET `/workspaces/{workspace_id}`** — Get workspace details when the caller has a membership.

### 2.2 Users Module (`/api/v1/users`)
Profile management and settings under active workspace boundaries.

* **GET `/users/me`**
  - Description: Retrieve the currently logged-in user profile.
* **PUT `/users/me`**
  - Description: Update profile metadata (name, settings).

### 2.3 Datasets Module (`/api/v1/datasets`)
Implemented workspace-isolated dataset metadata and CSV ingestion. All endpoints require a workspace membership.

* **GET `/datasets?workspace_id={workspace_id}`**
  - Description: List datasets in a workspace the caller belongs to.
* **POST `/datasets`**
  - Description: Create a new dataset placeholder.
* **POST `/datasets/{dataset_id}/upload`**
  - Description: Upload CSV feedback through `multipart/form-data`.
  - Content-Type: `multipart/form-data`
  - Required column: `text`; optional: `rating`, `source`, `timestamp`, `language`.
* **GET `/datasets/{dataset_id}`** and **DELETE `/datasets/{dataset_id}`**
  - Description: Retrieve or delete an accessible dataset; deletion cascades to feedback.
* **GET `/datasets/{dataset_id}/feedback`**
  - Description: List feedback rows for an accessible dataset.

### 2.4 Feedback Module (`/api/v1/feedback`)
Feedback records are created by CSV upload and are workspace isolated.

* **GET `/feedback/{feedback_id}`**
  - Description: Retrieve one feedback record when the caller belongs to its workspace.

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

#### Implemented Phase 4 retrieval routes

* **POST `/datasets/{dataset_id}/index`** — Build or rebuild that authorized dataset's FAISS index.
* **POST `/datasets/{dataset_id}/index/add`** — Add feedback absent from its persisted mapping; an existing completed index is required.
* **GET `/datasets/{dataset_id}/index-status`** — Returns lifecycle status, indexed count, model, dimension, timestamp, and error details.
* **POST `/search`** — Semantic search. Payload: `{ "workspace_id": "UUID", "query": "payment issue", "top_k": 10, "dataset_id": "optional UUID" }`. Membership is verified against `workspace_id`; results include feedback, dataset, workspace, language/rating, and cosine-similarity score.

Search has no arbitrary score threshold. `top_k` is constrained to 1–100.
If an index file or mapping is missing or corrupt, search marks that dataset index as `failed` and returns `503 INDEX_UNAVAILABLE`; rebuild it before retrying.

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
## Implemented Phase 5 Conversations API

* `POST /conversations` — `{ workspace_id, title? }`.
* `GET /conversations?workspace_id=UUID`, `GET /conversations/{id}`, and `DELETE /conversations/{id}` — all require ownership and workspace membership.
* `POST /conversations/{id}/messages` — `{ content, dataset_id? }`; returns `message`, grounded `answer`, actual retrieved `evidence[]`, and retrieval metadata.

## Implemented Phase 6 Analytics API (`/api/v1/analytics`)

Business intelligence endpoints providing aggregated metrics over structured NLP analysis results. All endpoints require authentication and workspace membership verification. Optional `dataset_id` filters metrics to a single dataset; omitting it aggregates across all datasets in the workspace.

### 2.11.1 Overview Metrics
* **GET `/analytics/overview?workspace_id=UUID[&dataset_id=UUID]`**
  - Description: Get high-level dashboard metrics.
  - Response schema:
    ```json
    {
      "total_feedback": 1234,
      "analyzed_feedback": 980,
      "pending_analysis": 50,
      "failed_analysis": 4,
      "analysis_coverage_percentage": 79.5,
      "average_rating": 4.2,
      "sentiment_distribution": {
        "positive": 520,
        "neutral": 300,
        "negative": 160
      },
      "complaint_true": 120,
      "complaint_false": 750,
      "complaint_coverage_percentage": 88.8
    }
    ```

### 2.11.2 Sentiment Analytics
* **GET `/analytics/sentiment?workspace_id=UUID[&dataset_id=UUID][&start_date=YYYY-MM-DD][&end_date=YYYY-MM-DD]`**
  - Description: Fetch sentiment distribution with confidence metrics.
  - Response schema:
    ```json
    {
      "sentiment_distribution": {
        "positive": 520,
        "neutral": 300,
        "negative": 160
      },
      "sentiment_percentages": {
        "positive": 52.0,
        "neutral": 30.0,
        "negative": 16.0
      },
      "average_sentiment_confidence": {
        "positive": 0.96,
        "neutral": 0.89,
        "negative": 0.92
      },
      "total_with_sentiment": 980
    }
    ```

### 2.11.3 Aspect-Based Sentiment Analysis
* **GET `/analytics/aspects?workspace_id=UUID[&dataset_id=UUID][&limit=20]`**
  - Description: Retrieve top aspects by mention frequency with per-aspect sentiment distribution.
  - Response schema:
    ```json
    {
      "top_aspects": [
        {
          "aspect_term": "login speed",
          "mentions": 142,
          "average_confidence": 0.94,
          "sentiment_distribution": {
            "positive": 25,
            "neutral": 40,
            "negative": 77
          }
        }
      ]
    }
    ```

### 2.11.4 Emotion Analytics
* **GET `/analytics/emotions?workspace_id=UUID[&dataset_id=UUID]`**
  - Description: Get emotion distribution and coverage metrics.
  - Response schema:
    ```json
    {
      "emotion_distribution": {
        "happy": 150,
        "sad": 80,
        "angry": 60,
        "neutral": 40
      },
      "emotion_percentages": {
        "happy": 45.5,
        "sad": 24.2,
        "angry": 18.2,
        "neutral": 12.1
      },
      "emotion_coverage_percentage": 73.5,
      "total_with_emotion": 330,
      "total_analyses": 450
    }
    ```

### 2.11.5 Complaint Analytics
* **GET `/analytics/complaints?workspace_id=UUID[&dataset_id=UUID]`**
  - Description: Fetch complaint classification metrics and rate.
  - Response schema:
    ```json
    {
      "complaint_true": 120,
      "complaint_false": 750,
      "complaint_unknown": 110,
      "complaint_rate": 13.8,
      "complaint_coverage_percentage": 88.8
    }
    ```

### 2.11.6 Sentiment Trends
* **GET `/analytics/trends?workspace_id=UUID[&dataset_id=UUID][&start_date=YYYY-MM-DD][&end_date=YYYY-MM-DD][&granularity=daily|weekly|monthly]`**
  - Description: Retrieve time-series sentiment distribution grouped by date/week/month.
  - Response schema:
    ```json
    {
      "trends": [
        {
          "date": "2024-01-15",
          "positive": 45,
          "neutral": 20,
          "negative": 15,
          "unknown": 5,
          "total": 85
        }
      ],
      "granularity": "daily"
    }
    ```

### 2.11.7 Dataset Comparison
* **GET `/analytics/datasets?workspace_id=UUID[&dataset_ids=UUID1,UUID2,...]`**
  - Description: Compare metrics across multiple datasets.
  - Response schema:
    ```json
    {
      "comparison": [
        {
          "dataset_id": "UUID",
          "dataset_name": "Q4 2024 Feedback",
          "total_feedback": 500,
          "analyzed_feedback": 480,
          "analysis_coverage_percentage": 96.0,
          "average_rating": 4.1,
          "complaint_rate": 12.5
        }
      ]
    }
    ```

### 2.11.8 Source Comparison
* **GET `/analytics/sources?workspace_id=UUID[&dataset_id=UUID]`**
  - Description: Break down metrics by feedback source (email, chat, survey, etc.).
  - Response schema:
    ```json
    {
      "sources": [
        {
          "source": "email",
          "feedback_count": 450,
          "sentiment_distribution": {
            "positive": 280,
            "neutral": 100,
            "negative": 70
          },
          "complaint_rate": 15.6
        }
      ]
    }
    ```

**Authorization Note**: All analytics endpoints enforce workspace membership verification at the service layer. Cross-workspace data access is rejected. If a dataset_id is provided, verified membership in both workspace and dataset is required.

**NULL Handling Note**: Metrics exclude NULL values from percentage/rate calculations as specified in Phase 6. Coverage percentages are calculated as (non-NULL count) / (total count).

---

## 2.12 Competitor Intelligence Module (`/api/v1/competitors`)

Provides deterministic, explainable mention extraction and SQL-only aggregation for workspace-configured competitors.

### 2.12.1 Competitor CRUD
* **POST `/competitors`**
  - Description: Create a new competitor with aliases in a workspace.
  - Payload:
    ```json
    {
      "workspace_id": "UUID",
      "name": "Acme Corp",
      "aliases": ["acme", "acme inc"],
      "description": "Primary enterprise competitor",
      "active": true
    }
    ```
* **GET `/competitors?workspace_id=UUID`**
  - Description: List all competitors configured in a workspace.
* **GET `/competitors/{competitor_id}`**
  - Description: Get details for a specific competitor.
* **PATCH `/competitors/{competitor_id}`**
  - Description: Update competitor name, aliases, description, or active status.
  - Payload: `{ "name": "...", "aliases": ["..."], "active": false }`
* **DELETE `/competitors/{competitor_id}`**
  - Description: Delete competitor and cascade delete associated mentions.

### 2.12.2 Competitor Analysis & Benchmarking
* **POST `/datasets/{dataset_id}/competitors/analyze`**
  - Description: Deterministically scan feedback in a dataset for mentions of active competitors using regex word boundaries. No LLM or NLP recomputation is performed.
  - Response schema:
    ```json
    {
      "dataset_id": "UUID",
      "scanned_feedback_count": 250,
      "mentions_found": 35,
      "competitors_detected": 4
    }
    ```
* **GET `/datasets/{dataset_id}/competitors`**
  - Description: Retrieve competitor-level statistics for a specific dataset.
* **GET `/competitors/analysis?workspace_id=UUID[&dataset_id=UUID][&competitor_id=UUID]`**
  - Description: Workspace-level competitor benchmarking and sentiment analysis aggregated completely in SQL.
  - Response schema:
    ```json
    [
      {
        "competitor_id": "UUID",
        "competitor_name": "Acme Corp",
        "total_mentions": 120,
        "unique_feedback_count": 98,
        "positive_mentions": 42,
        "neutral_mentions": 25,
        "negative_mentions": 53,
        "sentiment_coverage": 100.0,
        "positive_percentage": 35.0,
        "neutral_percentage": 20.83,
        "negative_percentage": 44.17
      }
    ]
    ```
  - **NULL Semantics**: Mentions with NULL sentiment are excluded from positive/neutral/negative percentage denominators; coverage is computed as `(with_sentiment / total_mentions) * 100`.

---

## 2.13 Alerts Module (`/api/v1/alerts`)

Provides configurable threshold alert definitions and on-demand metric evaluation.

### 2.13.1 Alert CRUD
* **POST `/alerts`**
  - Description: Create an alert rule in a workspace.
  - Payload:
    ```json
    {
      "workspace_id": "UUID",
      "name": "High Negative Sentiment Alert",
      "alert_type": "threshold",
      "metric": "negative_sentiment_percentage",
      "operator": "gte",
      "threshold": 50.0,
      "dataset_id": "UUID (optional)",
      "competitor_id": "UUID (optional)",
      "enabled": true
    }
    ```
  - Supported metrics: `negative_sentiment_percentage`, `complaint_rate`, `analysis_coverage_percentage`, `competitor_negative_percentage`, `competitor_mentions`.
  - Supported operators: `gt`, `gte`, `lt`, `lte`.
* **GET `/alerts?workspace_id=UUID`**
  - Description: List all alerts for the workspace.
* **GET `/alerts/{alert_id}`**
  - Description: Get a specific alert rule.
* **PATCH `/alerts/{alert_id}`**
  - Description: Update alert threshold, operator, status, or reference filters.
* **DELETE `/alerts/{alert_id}`**
  - Description: Delete an alert rule.

### 2.13.2 Alert Evaluation
* **POST `/alerts/evaluate?workspace_id=UUID`**
  - Description: Evaluate all enabled alerts for a workspace against current computed metrics.
  - Response schema:
    ```json
    {
      "alerts": [
        {
          "id": "UUID",
          "name": "High Negative Sentiment Alert",
          "metric": "negative_sentiment_percentage",
          "operator": "gte",
          "threshold": 50.0,
          "current_value": 63.2,
          "triggered": true,
          "dataset_id": null,
          "competitor_id": null
        }
      ]
    }
    ```
  - **Evaluation Semantics**: If a metric is NULL or unavailable (e.g. 0 feedback records or no competitor mentions), the alert safely does **not** trigger (`triggered: false`). Disabled alerts are excluded from evaluation.
  - **Notification Scope**: External notifications (SMS, Email, Webhooks, Push) are out of scope for Phase 7; alerts represent the rule and evaluation layer.

