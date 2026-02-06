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
  messageCount: number
  lastMessageAt?: string
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | 'routing'
  content: string
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
