export type User = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role: string;
  created_at: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

type ApiErrorEnvelope = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type CurrentUserResponse = {
  user: User;
  workspaces: Workspace[];
};

export type Dataset = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  source: string | null;
  original_filename: string | null;
  row_count: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Feedback = {
  id: string;
  workspace_id: string;
  dataset_id: string;
  original_text: string;
  rating: number | null;
  source: string | null;
  timestamp: string | null;
  language: string | null;
  processing_status: string;
  created_at: string;
  updated_at: string;
};

export type UploadSummary = {
  dataset: Dataset;
  rows_read: number;
  rows_imported: number;
  rows_skipped: number;
  invalid_rows: Array<{ row: number; reason: string }>;
};

export type VectorIndexStatus = {
  dataset_id: string;
  workspace_id: string;
  status: "pending" | "indexing" | "completed" | "failed";
  indexed_count: number;
  embedding_model: string;
  embedding_dimension: number;
  index_type: string;
  last_indexed_at: string | null;
  error_message: string | null;
};

export type SemanticSearchResult = {
  feedback_id: string;
  dataset_id: string;
  workspace_id: string;
  text: string;
  language: string | null;
  rating: number | null;
  similarity_score: number;
};

export type Conversation = { id: string; workspace_id: string; user_id: string; title: string; created_at: string; updated_at: string };
export type ChatMessage = { id: string; conversation_id: string; role: "user" | "assistant"; content: string; provider: string | null; model: string | null; created_at: string };
export type Evidence = { feedback_id: string; dataset_id: string; similarity_score: number; rank: number; text: string };

// Analytics types
export type OverviewAnalytics = {
  total_feedback: number;
  analyzed_feedback: number;
  pending_feedback: number;
  failed_feedback: number;
  analysis_coverage_percentage: number | null;
  average_rating: number | null;
  complaint_count: number;
  complaint_rate: number | null;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
};

export type SentimentAnalytics = {
  sentiment_distribution: Record<string, number>;
  sentiment_percentages: Record<string, number | null>;
  average_sentiment_confidence: Record<string, number>;
  total_with_sentiment: number;
};

export type AspectItem = {
  aspect_term: string;
  mentions: number;
  average_confidence: number | null;
  sentiment_distribution: Record<string, number>;
};

export type AspectAnalytics = {
  top_aspects: AspectItem[];
};

export type EmotionAnalytics = {
  emotion_distribution: Record<string, number>;
  emotion_percentages: Record<string, number>;
  emotion_coverage_percentage: number | null;
  total_with_emotion: number;
  total_analyses: number;
};

export type ComplaintAnalytics = {
  complaint_true: number;
  complaint_false: number;
  complaint_unknown: number;
  complaint_rate: number | null;
  complaint_coverage_percentage: number | null;
};

export type TrendPoint = {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
  total: number;
};

export type TrendsAnalytics = {
  trends: TrendPoint[];
  granularity: string;
};

export type DatasetComparisonItem = {
  dataset_id: string;
  dataset_name: string;
} & OverviewAnalytics;

export type DatasetComparisonAnalytics = {
  datasets: DatasetComparisonItem[];
};

export type SourceItem = {
  source: string;
  feedback_count: number;
  sentiment_distribution: Record<string, number>;
  complaint_rate: number | null;
};

export type SourceComparisonAnalytics = {
  sources: SourceItem[];
};

export type Competitor = {
  id: string;
  workspace_id: string;
  name: string;
  aliases: string[];
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CompetitorAnalysisResult = {
  competitor_id: string;
  competitor_name: string;
  total_mentions: number;
  unique_feedback_count: number;
  positive_mentions: number;
  neutral_mentions: number;
  negative_mentions: number;
  sentiment_coverage: number | null;
  positive_percentage: number | null;
  neutral_percentage: number | null;
  negative_percentage: number | null;
};

export type DatasetCompetitorAnalysisSummary = {
  dataset_id: string;
  scanned_feedback_count: number;
  mentions_found: number;
  competitors_detected: number;
};

export type Alert = {
  id: string;
  workspace_id: string;
  name: string;
  alert_type: string;
  metric: string;
  operator: string;
  threshold: number;
  dataset_id: string | null;
  competitor_id: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type AlertEvaluationItem = {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  current_value: number | null;
  triggered: boolean;
  dataset_id: string | null;
  competitor_id: string | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

let accessToken: string | null = null;
let onAuthenticationFailure: (() => void) | null = null;

function setAccessToken(token: string | null): void {
  accessToken = token;
}

function setAuthenticationFailureHandler(handler: (() => void) | null): void {
  onAuthenticationFailure = handler;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | ApiErrorEnvelope
    | null;

  if (!response.ok || !body || body.success === false) {
    const error = body as ApiErrorEnvelope | null;
    throw new ApiError(
      error?.error?.message ?? "The server could not complete this request.",
      response.status,
      error?.error?.code,
    );
  }

  return (body as ApiEnvelope<T>).data;
}

async function refreshAccessToken(): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  const data = await parseResponse<AuthResponse>(response);
  setAccessToken(data.access_token);
  return data;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  mayRetryAfterRefresh = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && mayRetryAfterRefresh && path !== "/auth/refresh") {
    try {
      await refreshAccessToken();
      return request<T>(path, init, false);
    } catch {
      setAccessToken(null);
      onAuthenticationFailure?.();
    }
  }

  return parseResponse<T>(response);
}

async function upload<T>(path: string, file: File, mayRetryAfterRefresh = true): Promise<T> {
  const headers = new Headers();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    body: form,
    headers,
    credentials: "include",
  });
  if (response.status === 401 && mayRetryAfterRefresh) {
    try {
      await refreshAccessToken();
      return upload<T>(path, file, false);
    } catch {
      setAccessToken(null);
      onAuthenticationFailure?.();
    }
  }
  return parseResponse<T>(response);
}

export const api = {
  setAccessToken,
  setAuthenticationFailureHandler,
  register: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }, false),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }, false),
  refresh: refreshAccessToken,
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }, false),
  getCurrentUser: () => request<CurrentUserResponse>("/auth/me"),
  listDatasets: (workspaceId: string) => request<Dataset[]>(`/datasets?workspace_id=${encodeURIComponent(workspaceId)}`),
  createDataset: (payload: { workspace_id: string; name: string; description?: string; source?: string }) =>
    request<Dataset>("/datasets", { method: "POST", body: JSON.stringify(payload) }),
  getDataset: (datasetId: string) => request<Dataset>(`/datasets/${datasetId}`),
  deleteDataset: (datasetId: string) => request<{ message: string }>(`/datasets/${datasetId}`, { method: "DELETE" }),
  uploadDatasetCsv: (datasetId: string, file: File) => upload<UploadSummary>(`/datasets/${datasetId}/upload`, file),
  listDatasetFeedback: (datasetId: string) => request<Feedback[]>(`/datasets/${datasetId}/feedback`),
  buildDatasetIndex: (datasetId: string) => request<VectorIndexStatus>(`/datasets/${datasetId}/index`, { method: "POST" }),
  getDatasetIndexStatus: (datasetId: string) => request<VectorIndexStatus>(`/datasets/${datasetId}/index-status`),
  semanticSearch: (payload: { workspace_id: string; query: string; top_k: number; dataset_id?: string }) => request<{ workspace_id: string; query: string; results: SemanticSearchResult[] }>("/search", { method: "POST", body: JSON.stringify(payload) }),
  listConversations: (workspaceId: string) => request<Conversation[]>(`/conversations?workspace_id=${encodeURIComponent(workspaceId)}`),
  createConversation: (payload: { workspace_id: string; title?: string }) => request<Conversation>("/conversations", { method: "POST", body: JSON.stringify(payload) }),
  getConversation: (id: string) => request<Conversation & { messages: ChatMessage[] }>(`/conversations/${id}`),
  sendMessage: (id: string, payload: { content: string; dataset_id?: string }) => request<{ message: ChatMessage; answer: string; evidence: Evidence[]; retrieval_metadata: Record<string, unknown> }>(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify(payload) }),
  // Analytics endpoints
  getOverviewAnalytics: (workspaceId: string, datasetId?: string) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetId) params.append("dataset_id", datasetId);
    return request<OverviewAnalytics>(`/analytics/overview?${params.toString()}`);
  },
  getSentimentAnalytics: (workspaceId: string, datasetId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetId) params.append("dataset_id", datasetId);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return request<SentimentAnalytics>(`/analytics/sentiment?${params.toString()}`);
  },
  getAspectAnalytics: (workspaceId: string, datasetId?: string, limit?: number) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetId) params.append("dataset_id", datasetId);
    if (limit) params.append("limit", limit.toString());
    return request<AspectAnalytics>(`/analytics/aspects?${params.toString()}`);
  },
  getEmotionAnalytics: (workspaceId: string, datasetId?: string) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetId) params.append("dataset_id", datasetId);
    return request<EmotionAnalytics>(`/analytics/emotions?${params.toString()}`);
  },
  getComplaintAnalytics: (workspaceId: string, datasetId?: string) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetId) params.append("dataset_id", datasetId);
    return request<ComplaintAnalytics>(`/analytics/complaints?${params.toString()}`);
  },
  getTrendsAnalytics: (workspaceId: string, datasetId?: string, startDate?: string, endDate?: string, granularity?: string) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetId) params.append("dataset_id", datasetId);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (granularity) params.append("granularity", granularity);
    return request<TrendsAnalytics>(`/analytics/trends?${params.toString()}`);
  },
  getDatasetComparison: (workspaceId: string, datasetIds?: string[]) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetIds?.length) params.append("dataset_ids", datasetIds.join(","));
    return request<DatasetComparisonAnalytics>(`/analytics/datasets?${params.toString()}`);
  },
  getSourceComparison: (workspaceId: string, datasetId?: string) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetId) params.append("dataset_id", datasetId);
    return request<SourceComparisonAnalytics>(`/analytics/sources?${params.toString()}`);
  },

  // Competitor endpoints
  listCompetitors: (workspaceId: string) =>
    request<Competitor[]>(`/competitors?workspace_id=${encodeURIComponent(workspaceId)}`),
  createCompetitor: (payload: { workspace_id: string; name: string; aliases?: string[]; description?: string; active?: boolean }) =>
    request<Competitor>("/competitors", { method: "POST", body: JSON.stringify(payload) }),
  getCompetitor: (competitorId: string) => request<Competitor>(`/competitors/${competitorId}`),
  updateCompetitor: (competitorId: string, payload: { name?: string; aliases?: string[]; description?: string; active?: boolean }) =>
    request<Competitor>(`/competitors/${competitorId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteCompetitor: (competitorId: string) =>
    request<{ message: string }>(`/competitors/${competitorId}`, { method: "DELETE" }),
  analyzeDatasetCompetitors: (datasetId: string) =>
    request<DatasetCompetitorAnalysisSummary>(`/datasets/${datasetId}/competitors/analyze`, { method: "POST" }),
  getDatasetCompetitors: (datasetId: string) =>
    request<CompetitorAnalysisResult[]>(`/datasets/${datasetId}/competitors`),
  getCompetitorAnalysis: (workspaceId: string, datasetId?: string, competitorId?: string) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (datasetId) params.append("dataset_id", datasetId);
    if (competitorId) params.append("competitor_id", competitorId);
    return request<CompetitorAnalysisResult[]>(`/competitors/analysis?${params.toString()}`);
  },

  // Alert endpoints
  listAlerts: (workspaceId: string) =>
    request<Alert[]>(`/alerts?workspace_id=${encodeURIComponent(workspaceId)}`),
  createAlert: (payload: {
    workspace_id: string;
    name: string;
    alert_type?: string;
    metric: string;
    operator: string;
    threshold: number;
    dataset_id?: string;
    competitor_id?: string;
    enabled?: boolean;
  }) => request<Alert>("/alerts", { method: "POST", body: JSON.stringify(payload) }),
  getAlert: (alertId: string) => request<Alert>(`/alerts/${alertId}`),
  updateAlert: (alertId: string, payload: {
    name?: string;
    metric?: string;
    operator?: string;
    threshold?: number;
    dataset_id?: string | null;
    competitor_id?: string | null;
    enabled?: boolean;
  }) => request<Alert>(`/alerts/${alertId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAlert: (alertId: string) => request<{ message: string }>(`/alerts/${alertId}`, { method: "DELETE" }),
  evaluateAlerts: (workspaceId: string) =>
    request<{ alerts: AlertEvaluationItem[] }>(`/alerts/evaluate?workspace_id=${encodeURIComponent(workspaceId)}`, { method: "POST" }),
};
