export enum ProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  DEEPSEEK = 'deepseek',
  YI = 'yi',
  CUSTOM = 'custom',
}

export type ProviderStatus = 'untested' | 'connected' | 'failed'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  enabled: boolean
  status: ProviderStatus
  latencyMs?: number
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
