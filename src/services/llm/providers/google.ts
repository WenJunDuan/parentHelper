import type { LLMClient, LLMRequest, LLMResponse } from '../types'

export class GoogleClient implements LLMClient {
  constructor(private readonly baseUrl: string) {}

  async createChat(request: LLMRequest): Promise<LLMResponse> {
    void request
    return {
      content: '[TODO] Google chat response',
      model: 'google-placeholder',
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
