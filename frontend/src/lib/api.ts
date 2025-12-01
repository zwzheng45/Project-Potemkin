import type {
  ChatResponse,
  CreateFamilyPayload,
  Family,
  HealthStatus,
  MemorySnapshot,
  MessagePayload,
  UpdateFamilyPayload,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request to ${path} failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return text ? (JSON.parse(text) as T) : ((undefined as unknown) as T)
}

export const api = {
  fetchHealth: (): Promise<HealthStatus> => request('/health'),
  fetchFamilies: (): Promise<Family[]> => request('/families'),
  createFamily: (payload: CreateFamilyPayload): Promise<Family> =>
    request('/families', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateFamily: (familyId: string, payload: UpdateFamilyPayload): Promise<Family> =>
    request(`/families/${familyId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteFamily: (familyId: string): Promise<void> =>
    request(`/families/${familyId}`, {
      method: 'DELETE',
    }),
  chatWithFamily: (familyId: string, payload: MessagePayload): Promise<ChatResponse> =>
    request(`/families/${familyId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  fetchMemory: (familyId: string): Promise<MemorySnapshot> =>
    request(`/families/${familyId}/memory`),
}
