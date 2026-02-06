export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface ToolDefinition {
  name: string
  description?: string
  inputSchema?: object
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface LLMRequest {
  messages: LLMMessage[]
  model: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tools?: ToolDefinition[]
}

export interface LLMResponse {
  content: string
  toolCalls?: ToolCall[]
  usage: {
    promptTokens: number
    completionTokens: number
  }
  model: string
}

export interface LLMClient {
  createChat(request: LLMRequest): Promise<LLMResponse>
  createStream(request: LLMRequest): Promise<Response>
}
