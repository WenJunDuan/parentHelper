import { dbExecute, dbSelect } from '../db'
import type { Conversation, ConversationMemory, Message } from '../../types'

const CONVERSATIONS_KEY = 'chat_conversations'
const CHAT_MESSAGES_KEY = 'chat_messages'
const CURRENT_CONVERSATION_KEY = 'chat_current_conversation_id'
const CONVERSATION_MEMORIES_KEY = 'chat_conversation_memories'

function isBrowser() {
  return typeof window !== 'undefined'
}

function readLocalStorage<T>(key: string): T | null {
  if (!isBrowser()) {
    return null
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeLocalStorage<T>(key: string, value: T) {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function readTextStorage(key: string): string | undefined {
  if (!isBrowser()) {
    return undefined
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return undefined
  }

  try {
    return JSON.parse(raw) as string
  } catch {
    return undefined
  }
}

function writeTextStorage(key: string, value?: string) {
  if (!isBrowser()) {
    return
  }

  if (!value) {
    window.localStorage.removeItem(key)
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

async function loadSettingsValue(key: string) {
  const rows = await dbSelect<Array<{ value: string }>>(
    'SELECT value FROM settings WHERE key = ? LIMIT 1',
    [key],
  ).catch(() => [])

  if (rows.length === 0) {
    return null
  }

  return rows[0].value
}

async function saveSettingsValue(key: string, value: string) {
  await dbExecute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value],
  ).catch(() => null)
}

export async function loadConversationsSnapshot() {
  const raw = await loadSettingsValue(CONVERSATIONS_KEY)
  if (raw) {
    try {
      const conversations = JSON.parse(raw) as Conversation[]
      writeLocalStorage(CONVERSATIONS_KEY, conversations)
      return conversations
    } catch {
      return readLocalStorage<Conversation[]>(CONVERSATIONS_KEY) ?? []
    }
  }

  return readLocalStorage<Conversation[]>(CONVERSATIONS_KEY) ?? []
}

export async function saveConversationsSnapshot(conversations: Conversation[]) {
  writeLocalStorage(CONVERSATIONS_KEY, conversations)
  await saveSettingsValue(CONVERSATIONS_KEY, JSON.stringify(conversations))
}

export async function loadMessagesSnapshot() {
  const raw = await loadSettingsValue(CHAT_MESSAGES_KEY)
  if (raw) {
    try {
      const messages = JSON.parse(raw) as Message[]
      writeLocalStorage(CHAT_MESSAGES_KEY, messages)
      return messages
    } catch {
      return readLocalStorage<Message[]>(CHAT_MESSAGES_KEY) ?? []
    }
  }

  return readLocalStorage<Message[]>(CHAT_MESSAGES_KEY) ?? []
}

export async function saveMessagesSnapshot(messages: Message[]) {
  writeLocalStorage(CHAT_MESSAGES_KEY, messages)
  await saveSettingsValue(CHAT_MESSAGES_KEY, JSON.stringify(messages))
}

export async function loadCurrentConversationIdSnapshot() {
  const raw = await loadSettingsValue(CURRENT_CONVERSATION_KEY)
  if (raw !== null) {
    writeTextStorage(CURRENT_CONVERSATION_KEY, raw)
    return raw || undefined
  }

  return readTextStorage(CURRENT_CONVERSATION_KEY)
}

export async function saveCurrentConversationIdSnapshot(conversationId?: string) {
  writeTextStorage(CURRENT_CONVERSATION_KEY, conversationId)
  await saveSettingsValue(CURRENT_CONVERSATION_KEY, conversationId ?? '')
}

export async function loadConversationMemoriesSnapshot() {
  const raw = await loadSettingsValue(CONVERSATION_MEMORIES_KEY)
  if (raw) {
    try {
      const memories = JSON.parse(raw) as ConversationMemory[]
      writeLocalStorage(CONVERSATION_MEMORIES_KEY, memories)
      return memories
    } catch {
      return readLocalStorage<ConversationMemory[]>(CONVERSATION_MEMORIES_KEY) ?? []
    }
  }

  return readLocalStorage<ConversationMemory[]>(CONVERSATION_MEMORIES_KEY) ?? []
}

export async function saveConversationMemoriesSnapshot(memories: ConversationMemory[]) {
  writeLocalStorage(CONVERSATION_MEMORIES_KEY, memories)
  await saveSettingsValue(CONVERSATION_MEMORIES_KEY, JSON.stringify(memories))
}

