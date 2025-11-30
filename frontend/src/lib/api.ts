import type {
  ChatResponse,
  CreateFamilyPayload,
  Family,
  HealthStatus,
  MemorySnapshot,
  MessagePayload,
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

  return response.json() as Promise<T>
}

export const api = {
  fetchHealth: (): Promise<HealthStatus> => request('/health'),
  fetchFamilies: (): Promise<Family[]> => request('/families'),
  createFamily: (payload: CreateFamilyPayload): Promise<Family> =>
    request('/families', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  chatWithFamily: (familyId: string, payload: MessagePayload): Promise<ChatResponse> =>
    request(`/families/${familyId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  fetchMemory: (familyId: string): Promise<MemorySnapshot> =>
    request(`/families/${familyId}/memory`),
}
