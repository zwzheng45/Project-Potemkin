import type {
  AuthResponse,
  ChatResponse,
  Family,
  FamilyMember,
  HealthStatus,
  InviteMemberPayload,
  LoginPayload,
  MemorySnapshot,
  MessagePayload,
  ProfileResponse,
  SignupPayload,
} from '../types'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const text = await response.text()
  const parsed = text ? JSON.parse(text) : undefined

  if (!response.ok) {
    const detail = parsed?.detail ?? parsed?.message ?? text
    throw new Error(detail || `Request to ${path} failed: ${response.status}`)
  }

  return parsed as T
}

export const api = {
  fetchHealth: (): Promise<HealthStatus> => request('/health'),
  signup: (payload: SignupPayload): Promise<AuthResponse> =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: LoginPayload): Promise<AuthResponse> =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  fetchProfile: (token: string): Promise<ProfileResponse> => request('/me', undefined, token),
  fetchFamily: (token: string): Promise<Family> => request('/families/me', undefined, token),
  fetchFamilies: (token: string): Promise<Family[]> => request('/families', undefined, token),
  chatWithFamily: (
    familyId: string,
    payload: MessagePayload,
    token: string,
  ): Promise<ChatResponse> =>
    request(
      `/families/${familyId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  fetchMemory: (familyId: string, token: string): Promise<MemorySnapshot> =>
    request(`/families/${familyId}/memory`, undefined, token),
  inviteMember: (
    familyId: string,
    payload: InviteMemberPayload,
    token: string,
  ): Promise<FamilyMember> =>
    request(
      `/families/${familyId}/members`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
}
