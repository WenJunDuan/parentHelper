import type { Provider } from '../../types'
import { ProviderType } from '../../types'
import { AnthropicClient } from './providers/anthropic'
import { GoogleClient } from './providers/google'
import { OpenAICompatClient } from './providers/openaiCompat'
import { OpenAIClient } from './providers/openai'
import type { LLMClient, LLMRequest } from './types'

export function createLLMClient(provider: Provider): LLMClient {
  switch (provider.type) {
    case ProviderType.OPENAI:
      return new OpenAIClient(provider.baseUrl)
    case ProviderType.DEEPSEEK:
    case ProviderType.YI:
    case ProviderType.CUSTOM:
      return new OpenAICompatClient(provider.baseUrl)
    case ProviderType.ANTHROPIC:
      return new AnthropicClient(provider.baseUrl)
    case ProviderType.GOOGLE:
      return new GoogleClient(provider.baseUrl)
    default:
      return new OpenAICompatClient(provider.baseUrl)
  }
}

export async function* streamChat(request: LLMRequest, provider: Provider): AsyncGenerator<string> {
  const client = createLLMClient(provider)
  await client.createStream(request)
  yield '[TODO] streaming token placeholder'
}
