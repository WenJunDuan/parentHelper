export interface McpTool {
  id: string
  name: string
  description?: string
  inputSchema?: object
}

export interface McpServer {
  id: string
  name: string
  transport: 'sse' | 'stdio'
  url: string
  status: 'connected' | 'disconnected' | 'error'
  discoveredTools: McpTool[]
  createdAt: string
}
