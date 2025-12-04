export type FamilyMember = {
  user_id: string
  name: string
  email: string
  role: string
  avatar_url?: string | null
  bio?: string | null
}

export type Family = {
  family_id: string
  name: string
  description: string
  language: string
  owner_id?: string | null
  members: FamilyMember[]
}

export type TimelineEvent = {
  content: string
  date?: string
  image_data?: string | null
}

export type MemorySnapshot = {
  stm: string[]
  ltm: string[]
  profile: string[]
  important_events?: TimelineEvent[]
  private?: string[]
  public?: string[]
  user_stm?: string[]
}

export type ChatResponse = {
  family_id: string
  user_id: string
  user_name: string
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

export type SignupPayload = {
  family_name: string
  description?: string
  language?: string
  family_id?: string
  task_price?: number
  user_name: string
  email: string
  password: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type InviteMemberPayload = {
  name: string
  email: string
  role?: string
}

export type InviteLinkResponse = {
  invite_token: string
  invite_url: string
  family_id: string
  family_name: string
  email: string
  name: string
  role: string
  expires_at?: number | null
}

export type InviteInfo = {
  invite_token: string
  family_id: string
  family_name: string
  email: string
  name: string
  role: string
  expires_at?: number | null
  used: boolean
  expired: boolean
}

export type AcceptInvitePayload = {
  token: string
  name: string
  email: string
  password: string
}

export type MessagePayload = {
  content: string
}

export type AuthResponse = {
  token: string
  user: FamilyMember
  family: Family
}

export type ProfileResponse = {
  user: FamilyMember
  family: Family
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
}

export type ImportantEventsResponse = {
  events: TimelineEvent[]
}
