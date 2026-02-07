export enum ProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  DEEPSEEK = 'deepseek',
  YI = 'yi',
  CUSTOM = 'custom',
}

export type ProviderStatus = 'untested' | 'connected' | 'failed'

export type ModelKind = '通用模型' | '嵌入模型'

export interface ManagedModel {
  id: string
  name: string
  kind: ModelKind
  temperature: number
  enabled: boolean
  description: string
}

export type ProviderModelMap = Record<string, ManagedModel[]>

export type ProviderProtocol =
  | 'openai-compatible'
  | 'anthropic-messages'
  | 'google-genai'
  | 'custom-http'

export type AuthScheme = 'bearer' | 'x-api-key' | 'custom-header'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  enabled: boolean
  status: ProviderStatus
  protocol?: ProviderProtocol
  authScheme?: AuthScheme
  chatPath?: string
  embeddingPath?: string
  customHeaderName?: string
  latencyMs?: number
  generalModel?: string
  embeddingModel?: string
  createdAt: string
}

export interface ModelConfig {
  chatProviderId: string
  chatModelId: string
  embedProviderId: string
  embedModelId: string
  temperature: number
  maxTokens: number
}
