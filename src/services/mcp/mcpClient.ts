import type { McpServer, McpTool } from '../../types'

export class McpClient {
  async connect(server: McpServer): Promise<boolean> {
    void server
    return true
  }

  async listTools(server: McpServer): Promise<McpTool[]> {
    void server
    return []
  }
}
