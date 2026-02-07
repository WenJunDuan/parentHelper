import { dbExecute, dbSelect } from '../db'
import type { Task } from '../../types'

const TASKS_KEY = 'homework_tasks'

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

export async function loadTaskSnapshot() {
  const rows = await dbSelect<Array<{ value: string }>>(
    'SELECT value FROM settings WHERE key = ? LIMIT 1',
    [TASKS_KEY],
  ).catch(() => [])

  if (rows.length > 0) {
    try {
      const tasks = JSON.parse(rows[0].value) as Task[]
      writeLocalStorage(TASKS_KEY, tasks)
      return tasks
    } catch {
      return readLocalStorage<Task[]>(TASKS_KEY) ?? []
    }
  }

  return readLocalStorage<Task[]>(TASKS_KEY) ?? []
}

export async function saveTaskSnapshot(tasks: Task[]) {
  writeLocalStorage(TASKS_KEY, tasks)
  await dbExecute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [TASKS_KEY, JSON.stringify(tasks)],
  ).catch(() => null)
}

