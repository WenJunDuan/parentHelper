export interface PromptVersion {
  version: number
  content: string
  savedAt: string
}

export interface Agent {
  id: string
  name: string
  icon: string
  description: string
  type: 'preset' | 'custom'
  role: 'router' | 'executor'
  enabled: boolean
  systemPrompt: string
  promptVersion: number
  promptHistory: PromptVersion[]
  skillIds: string[]
  mcpServerIds: string[]
  modelOverride?: string
  canDelete: boolean
  createdAt: string
  updatedAt: string
}

export interface Skill {
  id: string
  name: string
  displayName: string
  description: string
  type: 'builtin' | 'mcp'
  mcpServerId?: string
  inputSchema?: object
  enabled: boolean
}
