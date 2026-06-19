const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export type LoginResponse = {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
};

export type ScoreSummary = {
  total: number;
  events: Array<{ id: string; action: string; points: number; createdAt: string }>;
};

export type WorkspaceSummary = {
  total: number;
  byStatus: Record<string, number>;
};

export type WorkItemType = 'feature' | 'bug' | 'improvement' | 'maintenance';
export type WorkItemStatus =
  | 'backlog'
  | 'planned'
  | 'in_progress'
  | 'qa'
  | 'ready_for_release'
  | 'released';
export type WorkItemPriority = 'low' | 'medium' | 'high' | 'urgent';

export type WorkItem = {
  id: string;
  title: string;
  description: string | null;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  assignee: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkItemPayload = {
  title: string;
  description?: string;
  type: WorkItemType;
  priority: WorkItemPriority;
  assignee?: string;
  dueDate?: string;
};

export type UpdateWorkItemPayload = {
  title?: string;
  description?: string;
  type?: WorkItemType;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  assignee?: string;
  dueDate?: string;
};

export type WorkItemsQuery = {
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  assignee?: string;
  search?: string;
  myWork?: boolean;
};

export type QaCheckStatus = 'pending' | 'passed' | 'failed';

export type QaCheck = {
  id: string;
  workItemId: string;
  testTitle: string;
  expectedResult: string;
  actualResult: string | null;
  status: QaCheckStatus;
  tester: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateQaCheckPayload = {
  testTitle: string;
  expectedResult: string;
  actualResult?: string;
  tester?: string;
  notes?: string;
};

export type DeploymentStatus = 'draft' | 'scheduled' | 'deployed' | 'rolled_back';

export type Release = {
  id: string;
  version: string;
  releaseDate: string | null;
  summary: string | null;
  deploymentStatus: DeploymentStatus;
  linkedWorkItemIds: string[];
  linkedWorkItems: WorkItem[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateQaCheckPayload = {
  testTitle?: string;
  expectedResult?: string;
  actualResult?: string;
  status?: QaCheckStatus;
  tester?: string;
  notes?: string;
};

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('spoton_challenge_token');
}

export function saveToken(token: string) {
  window.localStorage.setItem('spoton_challenge_token', token);
}

export function clearToken() {
  window.localStorage.removeItem('spoton_challenge_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(', ')
        : (data?.message ?? 'Request failed'),
    );
  }

  return data as T;
}

function buildQuery(params: Record<string, string | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== false) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<LoginResponse['user']>('/auth/me'),

  score: () => request<ScoreSummary>('/score/me'),

  workspaceSummary: () => request<WorkspaceSummary>('/it-workspace/summary'),

  workItems: (query?: WorkItemsQuery) =>
    request<WorkItem[]>(
      `/it-workspace/work-items${buildQuery(query as Record<string, string | boolean | undefined> ?? {})}`,
    ),

  workItem: (id: string) => request<WorkItem>(`/it-workspace/work-items/${id}`),

  createWorkItem: (payload: CreateWorkItemPayload) =>
    request<WorkItem>('/it-workspace/work-items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateWorkItem: (id: string, payload: UpdateWorkItemPayload) =>
    request<WorkItem>(`/it-workspace/work-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteWorkItem: (id: string) =>
    request<void>(`/it-workspace/work-items/${id}`, { method: 'DELETE' }),

  qaChecks: (workItemId: string) =>
    request<QaCheck[]>(`/it-workspace/work-items/${workItemId}/qa-checks`),

  createQaCheck: (workItemId: string, payload: CreateQaCheckPayload) =>
    request<QaCheck>(`/it-workspace/work-items/${workItemId}/qa-checks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateQaCheck: (checkId: string, payload: UpdateQaCheckPayload) =>
    request<QaCheck>(`/it-workspace/qa-checks/${checkId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteQaCheck: (checkId: string) =>
    request<void>(`/it-workspace/qa-checks/${checkId}`, { method: 'DELETE' }),

  // --- Releases ---
  releases: () => request<Release[]>('/releases'),

  release: (id: string) => request<Release>(`/releases/${id}`),

  createRelease: (payload: { version: string; releaseDate?: string; summary?: string }) =>
    request<Release>('/releases', { method: 'POST', body: JSON.stringify(payload) }),

  updateRelease: (id: string, payload: { version?: string; releaseDate?: string; summary?: string; deploymentStatus?: DeploymentStatus }) =>
    request<Release>(`/releases/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  linkItems: (id: string, workItemIds: string[]) =>
    request<Release>(`/releases/${id}/link-items`, {
      method: 'POST',
      body: JSON.stringify({ workItemIds }),
    }),

  deployRelease: (id: string) =>
    request<Release>(`/releases/${id}/deploy`, { method: 'POST' }),

  deleteRelease: (id: string) =>
    request<void>(`/releases/${id}`, { method: 'DELETE' }),
};
