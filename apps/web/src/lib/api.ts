import type {
  AuthUser,
  CreateInspectionInput,
  Inspection,
  InspectionFilters,
  InspectionListResponse,
  Summary,
} from './types';

// Relative by default: dev proxy and nginx both make the API same-origin.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const TOKEN_KEY = 'qit.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // Request never reached the server.
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get fieldErrors(): Record<string, string[]> {
    return this.details && typeof this.details === 'object'
      ? (this.details as Record<string, string[]>)
      : {};
  }
}

export const AUTH_EXPIRED_EVENT = 'qit:auth-expired';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'You appear to be offline.');
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const envelope = payload as { error?: { code?: string; message?: string; details?: unknown } };
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? 'UNKNOWN',
      envelope?.error?.message ?? `Request failed with status ${response.status}`,
      envelope?.error?.details,
    );
  }

  return payload as T;
}

function toQueryString(filters: InspectionFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ user: AuthUser | null }>('/api/auth/me'),

  listInspections: (filters: InspectionFilters) =>
    request<InspectionListResponse>(`/api/inspections${toQueryString(filters)}`),

  getInspection: (id: string) => request<Inspection>(`/api/inspections/${id}`),

  createInspection: (input: CreateInspectionInput) =>
    request<Inspection>('/api/inspections', { method: 'POST', body: JSON.stringify(input) }),

  resolveInspection: (id: string, resolutionNote: string) =>
    request<Inspection>(`/api/inspections/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolutionNote }),
    }),

  getSummary: () => request<Summary>('/api/inspections/summary'),
};
