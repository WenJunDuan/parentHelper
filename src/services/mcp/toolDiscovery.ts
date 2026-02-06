import type { McpServer, McpTool } from '../../types'
import { McpClient } from './mcpClient'

const mcpClient = new McpClient()

export async function discoverTools(server: McpServer): Promise<McpTool[]> {
  return mcpClient.listTools(server)
}
