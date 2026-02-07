import { dbExecute, dbSelect } from '../db'
import type { ChildProfile } from '../../types'

const CHILD_PROFILES_KEY = 'child_profiles'
const ACTIVE_CHILD_KEY = 'active_child_id'

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

export async function loadChildProfilesSnapshot() {
  const rows = await dbSelect<Array<{ value: string }>>(
    'SELECT value FROM settings WHERE key = ? LIMIT 1',
    [CHILD_PROFILES_KEY],
  ).catch(() => [])

  if (rows.length > 0) {
    try {
      const profiles = JSON.parse(rows[0].value) as ChildProfile[]
      writeLocalStorage(CHILD_PROFILES_KEY, profiles)
      return profiles
    } catch {
      return readLocalStorage<ChildProfile[]>(CHILD_PROFILES_KEY) ?? []
    }
  }

  return readLocalStorage<ChildProfile[]>(CHILD_PROFILES_KEY) ?? []
}

export async function saveChildProfilesSnapshot(profiles: ChildProfile[]) {
  writeLocalStorage(CHILD_PROFILES_KEY, profiles)

  await dbExecute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [CHILD_PROFILES_KEY, JSON.stringify(profiles)],
  ).catch(() => null)
}

export async function loadActiveChildIdSnapshot() {
  const rows = await dbSelect<Array<{ value: string }>>(
    'SELECT value FROM settings WHERE key = ? LIMIT 1',
    [ACTIVE_CHILD_KEY],
  ).catch(() => [])

  if (rows.length > 0) {
    try {
      const activeChildId = rows[0].value
      writeLocalStorage(ACTIVE_CHILD_KEY, activeChildId)
      return activeChildId
    } catch {
      return readLocalStorage<string>(ACTIVE_CHILD_KEY) ?? undefined
    }
  }

  return readLocalStorage<string>(ACTIVE_CHILD_KEY) ?? undefined
}

export async function saveActiveChildIdSnapshot(activeChildId?: string) {
  if (isBrowser()) {
    if (activeChildId) {
      window.localStorage.setItem(ACTIVE_CHILD_KEY, JSON.stringify(activeChildId))
    } else {
      window.localStorage.removeItem(ACTIVE_CHILD_KEY)
    }
  }

  await dbExecute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [ACTIVE_CHILD_KEY, activeChildId ?? ''],
  ).catch(() => null)
}
