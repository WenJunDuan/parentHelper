import { dbExecute, dbSelect } from '../db'
import type { Provider, ProviderModelMap } from '../../types'

const PROVIDERS_KEY = 'providers'
const PROVIDER_MODELS_KEY = 'provider_models'

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

export async function loadProviderSnapshot() {
  const rows = await dbSelect<Array<{ value: string }>>(
    'SELECT value FROM settings WHERE key = ? LIMIT 1',
    [PROVIDERS_KEY],
  ).catch(() => [])

  if (rows.length > 0) {
    try {
      const providers = JSON.parse(rows[0].value) as Provider[]
      writeLocalStorage(PROVIDERS_KEY, providers)
      return providers
    } catch {
      return readLocalStorage<Provider[]>(PROVIDERS_KEY) ?? []
    }
  }

  return readLocalStorage<Provider[]>(PROVIDERS_KEY) ?? []
}

export async function saveProviderSnapshot(providers: Provider[]) {
  writeLocalStorage(PROVIDERS_KEY, providers)

  await dbExecute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [PROVIDERS_KEY, JSON.stringify(providers)],
  ).catch(() => null)
}

export async function loadProviderModelsSnapshot() {
  const rows = await dbSelect<Array<{ value: string }>>(
    'SELECT value FROM settings WHERE key = ? LIMIT 1',
    [PROVIDER_MODELS_KEY],
  ).catch(() => [])

  if (rows.length > 0) {
    try {
      const modelMap = JSON.parse(rows[0].value) as ProviderModelMap
      writeLocalStorage(PROVIDER_MODELS_KEY, modelMap)
      return modelMap
    } catch {
      return readLocalStorage<ProviderModelMap>(PROVIDER_MODELS_KEY) ?? {}
    }
  }

  return readLocalStorage<ProviderModelMap>(PROVIDER_MODELS_KEY) ?? {}
}

export async function saveProviderModelsSnapshot(modelMap: ProviderModelMap) {
  writeLocalStorage(PROVIDER_MODELS_KEY, modelMap)

  await dbExecute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [PROVIDER_MODELS_KEY, JSON.stringify(modelMap)],
  ).catch(() => null)
}
