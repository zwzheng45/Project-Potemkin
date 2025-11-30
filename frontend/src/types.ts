export type Family = {
  family_id: string
  name: string
  description: string
}

export type MemorySnapshot = {
  stm: string[]
  ltm: string[]
  profile: string[]
}

export type ChatResponse = {
  family_id: string
  reply: string
  context_used: string
  memory: MemorySnapshot
}

export type HealthStatus = {
  status: string
  onchain: string
}

export type CreateFamilyPayload = {
  name: string
  description?: string
  family_id?: string
  task_price?: number
}

export type MessagePayload = {
  sender: string
  content: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
