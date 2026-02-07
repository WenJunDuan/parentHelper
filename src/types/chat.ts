export interface Attachment {
  id: string
  name: string
  type: 'image' | 'pdf' | 'docx' | 'other'
  size: number
  path?: string
}

export interface Conversation {
  id: string
  title: string
  mode: 'parent' | 'child'
  kbIds: string[]
  currentAgent?: string
  childId?: string
  childName?: string
  subject?: string
  messageCount: number
  lastMessageAt?: string
  createdAt: string
}

export interface ConversationMemory {
  conversationId: string
  title: string
  childName?: string
  subject?: string
  summary: string
  archivedAt: string
  messageCount: number
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | 'routing'
  content: string
  childId?: string
  childName?: string
  subject?: string
  agentName?: string
  kbName?: string
  agentId?: string
  modelId?: string
  attachments?: Attachment[]
  referencesData?: object
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
  }
  createdAt: string
}
