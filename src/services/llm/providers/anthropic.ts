import type { LLMClient, LLMRequest, LLMResponse } from '../types'

export class AnthropicClient implements LLMClient {
  constructor(private readonly baseUrl: string) {}

  async createChat(request: LLMRequest): Promise<LLMResponse> {
    void request
    return {
      content: '[TODO] Anthropic chat response',
      model: 'anthropic-placeholder',
      usage: { promptTokens: 0, completionTokens: 0 },
    }
  }

  async createStream(request: LLMRequest): Promise<Response> {
    void request
    return new Response(null)
  }

  get endpoint() {
    return this.baseUrl
  }
}
