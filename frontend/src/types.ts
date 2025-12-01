export type FamilyMember = {
  name: string
  identity: string
}

export type Family = {
  family_id: string
  name: string
  description: string
  task_price?: number
  members: FamilyMember[]
  last_active_at?: string
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
  agent_uuid?: string | null
  families?: number
}

export type CreateFamilyPayload = {
  name: string
  description?: string
  family_id?: string
  task_price?: number
  members?: FamilyMember[]
}

export type UpdateFamilyPayload = {
  description?: string
  task_price?: number
  members?: FamilyMember[]
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
