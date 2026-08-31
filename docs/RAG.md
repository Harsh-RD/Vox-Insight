# Retrieval-Augmented Generation (RAG) Architecture - VoxInsight

This document details the planned Retrieval-Augmented Generation (RAG) workflow for the VoxInsight AI Business Assistant. The assistant retrieves relevant customer feedback records to provide grounded answers to user business queries.

> [!IMPORTANT]
> **Status**: PLANNED. The RAG architecture, vector search procedures, context schemas, and LLM orchestration methods are design blueprints. No functional code or external API configurations are active in this phase.

---

## 1. RAG Core Pipeline Flow

The AI Assistant processes queries by executing the following sequence of steps:

```mermaid
graph TD
    UserQuery["User Question (e.g., 'What are the main issues with payment in Hinglish feedback?')"]
    --> Embedder["1. Query Embedding Generation"]
    --> FAISSQuery["2. FAISS Vector Search"]
    --> TopK["3. Retrieve Top-K Matching Offsets"]
    --> FetchDB["4. Fetch Feedback Texts from PostgreSQL"]
    --> Context["5. Grounded Context Construction"]
    --> LLMInput["6. Compile System Prompt + Context + Query"]
    --> LLMExec["7. Send to Pluggable LLM Provider API"]
    --> Answer["8. Grounded Response Generation"]
    --> Citation["9. Present Grounded Answer with Citations to User"]
```

---

## 2. Pipeline Step Specifications

### Step 1: Query Embedding Generation
- **Action**: When a user inputs a query in the chat assistant, the backend processes the text string and generates a dense vector embedding.
- **Model**: Utilizes the same embedding model used to index feedback records, ensuring alignment in the shared vector space.

### Step 2: FAISS Vector Retrieval
- **Action**: Query the FAISS vector index with the generated query embedding.
- **Return Value**: FAISS returns the Top-K (e.g., 5-15) closest vector offsets and distance scores (cosine similarity or L2 distance).

### Step 3: Feedback Context Resolution
- **Action**: Map the retrieved vector offsets to primary keys (UUIDs) in the database.
- **PostgreSQL Query**: Query the database to retrieve the raw text, clean text, identified language, and derived analysis metrics (sentiment, aspect tags, emotion, and complaint labels) for those UUIDs.

### Step 4: Grounded Context Construction
- **Action**: Compile the retrieved database records into a clean, formatted text context blocks.
- **Format Example**:
  ```text
  ---
  Feedback ID: 25ad7c90-9511-4f11-9a74-d45a901844b2
  Text: "Payment gateway down tha, paise cut gaye validation page load nahi ho raha."
  Language: Hinglish
  Sentiment: Negative
  Aspects: Payment (Negative), Validation Page (Negative)
  ---
  ```

### Step 5: System Prompt and Guidelines Assembly
- **Action**: Create a prompt combining system instructions, retrieved context, and the user's question.
- **Prompt Guidelines**:
  - Enforce grounding constraints: "Answer the user's question using **only** the provided feedback context. If the answer is not supported by the context, state that you do not know. Do not invent facts."
  - Instruct the LLM to provide inline citations referencing the matching Feedback IDs (e.g., `[Feedback ID: 25ad7c90]`).

### Step 6: External LLM Call
- **Action**: Transmit the compiled prompt to the pluggable LLM provider (e.g., OpenAI, Anthropic, or Google Gemini APIs) using client SDKs.
- **Config**: Timeout limits and fallback systems are implemented to handle API rate limiting.

### Step 7: Grounded Response Generation
- **Action**: Receive the raw text output from the LLM, format citations, and stream the generated response to the frontend client. The system returns the generated markdown text alongside the array of source Feedback IDs used to construct the answer, allowing users to inspect the source customer reviews.

---

## Phase 4 retrieval foundation

Phase 4 implements steps 1–3 as a reusable semantic retrieval foundation: normalized 384-dimensional multilingual embeddings, persisted workspace/dataset-scoped FAISS indexes, positional UUID mapping, and authorized Feedback resolution. Phase 5 adds context construction, prompts, provider calls, chat sessions, answer generation, and citations as described below.
## Phase 5 implementation status

**IMPLEMENTED:** `POST /conversations/{id}/messages` verifies conversation ownership and workspace membership, then reuses Phase 4 `semantic_search` for embeddings, FAISS retrieval, and PostgreSQL-authorized feedback resolution. Optional datasets are separately authorized. Context is bounded by `RAG_TOP_K`, `RAG_MAX_CONTEXT_ITEMS`, `RAG_MAX_CONTEXT_CHARS`, and `RAG_MAX_HISTORY_MESSAGES`.

**SECURITY:** Retrieved feedback is untrusted, delimited data. The prompt forbids following feedback instructions, prompt disclosure, fabrication, and unsupported claims. Empty/below-threshold (`RAG_MIN_SIMILARITY`) retrieval returns controlled insufficient evidence without calling the LLM; the provider has no database or SQL access.

**PROVIDER:** OpenAI Chat Completions (`gpt-4o-mini` default) via a replaceable `LLMProvider`, configured by `LLM_API_KEY`, `LLM_MODEL`, and optional `LLM_BASE_URL`. Provider costs depend on bounded prompt size and current pricing. Timeout, rate-limit, malformed-response, configuration, and availability failures are controlled errors and do not persist incomplete assistant messages.

**UNKNOWN:** Live OpenAI and PostgreSQL runtime verification in this environment. **PLANNED:** no further provider is currently selected.
