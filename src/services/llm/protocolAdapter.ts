import type { Provider } from '../../types'
import type {
  ContentPart,
  LLMMessage,
  LLMRequest,
  ProviderRequestConfig,
  ProviderResponseParser,
} from './types'

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function normalizePath(pathValue: string) {
  if (!pathValue) {
    return ''
  }

  return pathValue.startsWith('/') ? pathValue : `/${pathValue}`
}

function joinEndpoint(baseUrl: string, pathValue: string) {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  const normalizedPath = normalizePath(pathValue)
  return `${normalizedBase}${normalizedPath}`
}

function asText(content: string | ContentPart[]) {
  if (typeof content === 'string') {
    return content
  }

  return content
    .map((part) => {
      if (part.type === 'text') {
        return part.text ?? ''
      }

      return '[image]'
    })
    .join('\n')
}

function resolveHeaders(provider: Provider, stream = false) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (provider.authScheme === 'x-api-key') {
    headers['x-api-key'] = provider.apiKey
  } else if (provider.authScheme === 'custom-header') {
    headers[provider.customHeaderName || 'X-API-Key'] = provider.apiKey
  } else {
    headers.Authorization = `Bearer ${provider.apiKey}`
  }

  if (stream) {
    headers.Accept = 'text/event-stream'
  }

  return headers
}

function toOpenAIMessage(messages: LLMMessage[]) {
  return messages.map((item) => ({
    role: item.role,
    content: item.content,
  }))
}

function toAnthropicMessage(messages: LLMMessage[]) {
  return messages
    .filter((item) => item.role !== 'system')
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: asText(item.content),
    }))
}

function toGoogleMessage(messages: LLMMessage[]) {
  return messages
    .filter((item) => item.role !== 'system')
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: asText(item.content) }],
    }))
}

function resolveSystemPrompt(messages: LLMMessage[]) {
  return messages
    .filter((item) => item.role === 'system')
    .map((item) => asText(item.content))
    .join('\n\n')
}

function resolveChatPath(provider: Provider) {
  if (provider.chatPath) {
    return provider.chatPath
  }

  if (provider.protocol === 'anthropic-messages') {
    return '/v1/messages'
  }

  if (provider.protocol === 'google-genai') {
    return '/models/{model}:generateContent'
  }

  return '/chat/completions'
}

function resolveGoogleEndpoint(provider: Provider, model: string) {
  const path = resolveChatPath(provider)
  const replaced = path.includes('{model}') ? path.replace('{model}', model) : `/models/${model}:generateContent`
  return joinEndpoint(provider.baseUrl, replaced)
}

function buildOpenAiPayload(request: LLMRequest) {
  return {
    model: request.model,
    messages: toOpenAIMessage(request.messages),
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    stream: Boolean(request.stream),
    tools: request.tools,
  }
}

function buildAnthropicPayload(request: LLMRequest) {
  return {
    model: request.model,
    system: resolveSystemPrompt(request.messages),
    messages: toAnthropicMessage(request.messages),
    temperature: request.temperature,
    max_tokens: request.maxTokens ?? 1024,
    stream: Boolean(request.stream),
  }
}

function buildGooglePayload(request: LLMRequest) {
  return {
    contents: toGoogleMessage(request.messages),
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.maxTokens,
    },
  }
}

export function buildProviderRequest(provider: Provider, request: LLMRequest): ProviderRequestConfig {
  const protocol = provider.protocol ?? 'openai-compatible'

  if (protocol === 'anthropic-messages') {
    const endpoint = joinEndpoint(provider.baseUrl, resolveChatPath(provider))
    return {
      endpoint,
      headers: {
        ...resolveHeaders(provider, Boolean(request.stream)),
        'anthropic-version': '2023-06-01',
      },
      payload: buildAnthropicPayload(request),
    }
  }

  if (protocol === 'google-genai') {
    return {
      endpoint: resolveGoogleEndpoint(provider, request.model),
      headers: resolveHeaders(provider, Boolean(request.stream)),
      payload: buildGooglePayload(request),
    }
  }

  return {
    endpoint: joinEndpoint(provider.baseUrl, resolveChatPath(provider)),
    headers: resolveHeaders(provider, Boolean(request.stream)),
    payload: buildOpenAiPayload(request),
  }
}

function readUsage(raw: unknown): ProviderResponseParser['usage'] {
  if (!raw || typeof raw !== 'object') {
    return {
      promptTokens: 0,
      completionTokens: 0,
    }
  }

  const usage = raw as Record<string, unknown>
  return {
    promptTokens: Number(usage.prompt_tokens ?? usage.promptTokenCount ?? 0),
    completionTokens: Number(usage.completion_tokens ?? usage.candidatesTokenCount ?? 0),
  }
}

function parseOpenAiContent(raw: Record<string, unknown>) {
  const choices = Array.isArray(raw.choices) ? (raw.choices as Array<Record<string, unknown>>) : []
  const first = choices[0] ?? {}
  const message = (first.message as Record<string, unknown> | undefined) ?? {}
  const content = typeof message.content === 'string' ? message.content : ''
  return content
}

function parseAnthropicContent(raw: Record<string, unknown>) {
  const contentBlocks = Array.isArray(raw.content) ? (raw.content as Array<Record<string, unknown>>) : []

  return contentBlocks
    .map((block) => (typeof block.text === 'string' ? block.text : ''))
    .join('\n')
    .trim()
}

function parseGoogleContent(raw: Record<string, unknown>) {
  const candidates = Array.isArray(raw.candidates)
    ? (raw.candidates as Array<Record<string, unknown>>)
    : []
  const firstCandidate = candidates[0] ?? {}
  const contentObj = (firstCandidate.content as Record<string, unknown> | undefined) ?? {}
  const parts = Array.isArray(contentObj.parts)
    ? (contentObj.parts as Array<Record<string, unknown>>)
    : []

  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim()
}

export function parseProviderResponse(provider: Provider, raw: unknown): ProviderResponseParser {
  const data = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >

  const protocol = provider.protocol ?? 'openai-compatible'

  if (protocol === 'anthropic-messages') {
    return {
      content: parseAnthropicContent(data),
      usage: readUsage(data.usage),
    }
  }

  if (protocol === 'google-genai') {
    return {
      content: parseGoogleContent(data),
      usage: readUsage(data.usageMetadata),
    }
  }

  return {
    content: parseOpenAiContent(data),
    usage: readUsage(data.usage),
  }
}

