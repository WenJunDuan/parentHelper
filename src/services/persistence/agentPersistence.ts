import { dbExecute, dbSelect } from '../db'
import type { Agent, McpServer, Skill } from '../../types'

const AGENTS_KEY = 'agents_snapshot'
const SKILLS_KEY = 'skills_snapshot'
const MCP_SERVERS_KEY = 'mcp_servers_snapshot'

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

export async function loadAgentSnapshot() {
  const raw = await loadSettingsValue(AGENTS_KEY)
  if (raw) {
    try {
      const agents = JSON.parse(raw) as Agent[]
      writeLocalStorage(AGENTS_KEY, agents)
      return agents
    } catch {
      return readLocalStorage<Agent[]>(AGENTS_KEY) ?? []
    }
  }

  return readLocalStorage<Agent[]>(AGENTS_KEY) ?? []
}

export async function saveAgentSnapshot(agents: Agent[]) {
  writeLocalStorage(AGENTS_KEY, agents)
  await saveSettingsValue(AGENTS_KEY, JSON.stringify(agents))
}

export async function loadSkillSnapshot() {
  const raw = await loadSettingsValue(SKILLS_KEY)
  if (raw) {
    try {
      const skills = JSON.parse(raw) as Skill[]
      writeLocalStorage(SKILLS_KEY, skills)
      return skills
    } catch {
      return readLocalStorage<Skill[]>(SKILLS_KEY) ?? []
    }
  }

  return readLocalStorage<Skill[]>(SKILLS_KEY) ?? []
}

export async function saveSkillSnapshot(skills: Skill[]) {
  writeLocalStorage(SKILLS_KEY, skills)
  await saveSettingsValue(SKILLS_KEY, JSON.stringify(skills))
}

export async function loadMcpServerSnapshot() {
  const raw = await loadSettingsValue(MCP_SERVERS_KEY)
  if (raw) {
    try {
      const servers = JSON.parse(raw) as McpServer[]
      writeLocalStorage(MCP_SERVERS_KEY, servers)
      return servers
    } catch {
      return readLocalStorage<McpServer[]>(MCP_SERVERS_KEY) ?? []
    }
  }

  return readLocalStorage<McpServer[]>(MCP_SERVERS_KEY) ?? []
}

export async function saveMcpServerSnapshot(servers: McpServer[]) {
  writeLocalStorage(MCP_SERVERS_KEY, servers)
  await saveSettingsValue(MCP_SERVERS_KEY, JSON.stringify(servers))
}

