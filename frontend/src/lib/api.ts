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
};
