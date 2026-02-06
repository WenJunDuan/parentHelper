import type { Conversation } from '../../types'
import { RouterAgent } from './routerAgent'

export type AgentEvent =
  | { type: 'routing'; agent: string; reason: string }
  | { type: 'token'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export class AgentRuntime {
  private readonly routerAgent = new RouterAgent()

  async *processMessage(
    userMessage: string,
    conversation: Conversation,
  ): AsyncGenerator<AgentEvent> {
    void conversation
    const route = await this.routerAgent.route(userMessage)
    yield {
      type: 'routing',
      agent: route.targetAgentId,
      reason: route.reason,
    }
    yield {
      type: 'token',
      content: '[TODO] agent response placeholder',
    }
    yield { type: 'done' }
  }
}
