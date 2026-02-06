import { create } from 'zustand'
import type { Agent, McpServer, Skill } from '../types'

type AgentState = {
  agents: Agent[]
  skills: Skill[]
  mcpServers: McpServer[]
  setAgents: (agents: Agent[]) => void
  setSkills: (skills: Skill[]) => void
  setMcpServers: (servers: McpServer[]) => void
  reset: () => void
}

const initialState = {
  agents: [],
  skills: [],
  mcpServers: [],
}

export const useAgentStore = create<AgentState>((set) => ({
  ...initialState,
  setAgents: (agents) => set({ agents }),
  setSkills: (skills) => set({ skills }),
  setMcpServers: (mcpServers) => set({ mcpServers }),
  reset: () => set(initialState),
}))
