export interface RouteResult {
  targetAgentId: string
  reason: string
}

export class RouterAgent {
  async route(userMessage: string): Promise<RouteResult> {
    if (userMessage.includes('计划') || userMessage.includes('安排')) {
      return {
        targetAgentId: 'study-planner',
        reason: '命中计划类关键词',
      }
    }

    if (userMessage.includes('什么是') || userMessage.includes('为什么')) {
      return {
        targetAgentId: 'knowledge-qa',
        reason: '命中问答类关键词',
      }
    }

    return {
      targetAgentId: 'homework-tutor',
      reason: '默认路由到作业辅导',
    }
  }
}
