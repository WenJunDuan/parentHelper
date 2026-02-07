import { dbExecute, dbSelect } from '../db'
import type { Document, KnowledgeBase } from '../../types'

const KNOWLEDGE_BASES_KEY = 'knowledge_bases_snapshot'
const DOCUMENTS_KEY = 'knowledge_documents_snapshot'

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

export async function loadKnowledgeBaseSnapshot() {
  const raw = await loadSettingsValue(KNOWLEDGE_BASES_KEY)
  if (raw) {
    try {
      const payload = JSON.parse(raw) as KnowledgeBase[]
      writeLocalStorage(KNOWLEDGE_BASES_KEY, payload)
      return payload
    } catch {
      return readLocalStorage<KnowledgeBase[]>(KNOWLEDGE_BASES_KEY) ?? []
    }
  }

  return readLocalStorage<KnowledgeBase[]>(KNOWLEDGE_BASES_KEY) ?? []
}

export async function saveKnowledgeBaseSnapshot(knowledgeBases: KnowledgeBase[]) {
  writeLocalStorage(KNOWLEDGE_BASES_KEY, knowledgeBases)
  await saveSettingsValue(KNOWLEDGE_BASES_KEY, JSON.stringify(knowledgeBases))
}

export async function loadDocumentSnapshot() {
  const raw = await loadSettingsValue(DOCUMENTS_KEY)
  if (raw) {
    try {
      const payload = JSON.parse(raw) as Document[]
      writeLocalStorage(DOCUMENTS_KEY, payload)
      return payload
    } catch {
      return readLocalStorage<Document[]>(DOCUMENTS_KEY) ?? []
    }
  }

  return readLocalStorage<Document[]>(DOCUMENTS_KEY) ?? []
}

export async function saveDocumentSnapshot(documents: Document[]) {
  writeLocalStorage(DOCUMENTS_KEY, documents)
  await saveSettingsValue(DOCUMENTS_KEY, JSON.stringify(documents))
}

