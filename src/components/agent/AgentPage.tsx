import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  Circle,
  Database,
  Pencil,
  Plug,
  Plus,
  Puzzle,
  Route,
  Save,
  Shield,
  Trash2,
  Workflow,
} from 'lucide-react'
import { presetAgents } from '../../services/agent/presetAgents'
import {
  loadAgentSnapshot,
  loadMcpServerSnapshot,
  loadSkillSnapshot,
  saveAgentSnapshot,
  saveMcpServerSnapshot,
  saveSkillSnapshot,
} from '../../services/persistence'
import { useAgentStore } from '../../stores/useAgentStore'
import type { Agent, McpServer, Skill } from '../../types'

type AgentTab = 'agent' | 'skills' | 'mcp'

type AgentForm = {
  name: string
  icon: string
  description: string
  role: Agent['role']
  modelOverride: string
  systemPrompt: string
  enabled: boolean
}

type SkillForm = {
  name: string
  displayName: string
  description: string
  type: Skill['type']
}

type McpForm = {
  name: string
  transport: McpServer['transport']
  url: string
  status: McpServer['status']
}

const skillTemplates: Skill[] = [
  {
    id: 'ocr_parse',
    name: 'ocr_parse',
    displayName: 'OCR 解析',
    description: '识别作业图片文字并输出结构化内容',
    type: 'builtin',
    enabled: true,
  },
  {
    id: 'rag_search',
    name: 'rag_search',
    displayName: '资料检索',
    description: '从学习资料中检索可引用内容',
    type: 'builtin',
    enabled: true,
  },
  {
    id: 'task_create',
    name: 'task_create',
    displayName: '作业生成',
    description: '根据对话上下文生成家庭作业任务',
    type: 'builtin',
    enabled: true,
  },
  {
    id: 'calculator',
    name: 'calculator',
    displayName: '数学计算器',
    description: '用于快速计算、验算与步骤拆解',
    type: 'builtin',
    enabled: true,
  },
  {
    id: 'web_search',
    name: 'web_search',
    displayName: '联网检索',
    description: '检索外部信息作为补充说明',
    type: 'builtin',
    enabled: false,
  },
]

const mcpTemplates: McpServer[] = [
  {
    id: 'mcp-knowledge-service',
    name: '知识检索服务',
    transport: 'sse',
    url: 'http://127.0.0.1:7701/sse',
    status: 'disconnected',
    discoveredTools: [
      { id: 'rag.search', name: 'rag.search', description: '查询学习资料片段' },
      { id: 'rag.list', name: 'rag.list', description: '列出可用学习资料' },
    ],
    createdAt: '2026-02-07T00:00:00.000Z',
  },
]

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}`
}

function defaultAgentForm(): AgentForm {
  return {
    name: '',
    icon: '🤖',
    description: '',
    role: 'executor',
    modelOverride: '',
    systemPrompt: '你是一个耐心、可靠的学习辅导助手。',
    enabled: true,
  }
}

function defaultSkillForm(): SkillForm {
  return {
    name: '',
    displayName: '',
    description: '',
    type: 'builtin',
  }
}

function defaultMcpForm(): McpForm {
  return {
    name: '',
    transport: 'sse',
    url: '',
    status: 'disconnected',
  }
}

function mapAgentToForm(agent: Agent): AgentForm {
  return {
    name: agent.name,
    icon: agent.icon,
    description: agent.description,
    role: agent.role,
    modelOverride: agent.modelOverride ?? '',
    systemPrompt: agent.systemPrompt,
    enabled: agent.enabled,
  }
}

export function AgentPage() {
  const { agents, skills, mcpServers, setAgents, setSkills, setMcpServers } = useAgentStore()

  const [initialized, setInitialized] = useState(false)
  const [activeTab, setActiveTab] = useState<AgentTab>('agent')
  const [activeAgentId, setActiveAgentId] = useState('')
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [agentForm, setAgentForm] = useState<AgentForm>(() => defaultAgentForm())

  const [skillForm, setSkillForm] = useState<SkillForm>(() => defaultSkillForm())
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)

  const [mcpForm, setMcpForm] = useState<McpForm>(() => defaultMcpForm())
  const [editingMcpId, setEditingMcpId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const [storedAgents, storedSkills, storedMcpServers] = await Promise.all([
        loadAgentSnapshot(),
        loadSkillSnapshot(),
        loadMcpServerSnapshot(),
      ])

      if (!active) {
        return
      }

      const nextAgents = storedAgents.length > 0 ? storedAgents : presetAgents
      const nextSkills = storedSkills.length > 0 ? storedSkills : skillTemplates
      const nextMcpServers = storedMcpServers.length > 0 ? storedMcpServers : mcpTemplates

      setAgents(nextAgents)
      setSkills(nextSkills)
      setMcpServers(nextMcpServers)

      setActiveAgentId(nextAgents[0]?.id ?? '')
      setInitialized(true)
    }

    void initialize()

    return () => {
      active = false
    }
  }, [setAgents, setMcpServers, setSkills])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveAgentSnapshot(agents)
  }, [agents, initialized])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveSkillSnapshot(skills)
  }, [initialized, skills])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveMcpServerSnapshot(mcpServers)
  }, [initialized, mcpServers])

  const resolvedActiveAgentId =
    activeAgentId && agents.some((item) => item.id === activeAgentId)
      ? activeAgentId
      : agents[0]?.id ?? ''

  const activeAgent = useMemo(
    () => agents.find((item) => item.id === resolvedActiveAgentId) ?? null,
    [agents, resolvedActiveAgentId],
  )

  const activeAgentSkills = useMemo(() => {
    if (!activeAgent) {
      return []
    }

    const skillSet = new Set(activeAgent.skillIds)
    return skills.filter((item) => skillSet.has(item.id))
  }, [activeAgent, skills])

  const activeAgentMcp = useMemo(() => {
    if (!activeAgent) {
      return []
    }

    const serverSet = new Set(activeAgent.mcpServerIds)
    return mcpServers.filter((item) => serverSet.has(item.id))
  }, [activeAgent, mcpServers])

  const enabledAgentCount = useMemo(
    () => agents.filter((item) => item.enabled).length,
    [agents],
  )

  const activeSkillCount = useMemo(() => skills.filter((item) => item.enabled).length, [skills])

  const connectedMcpCount = useMemo(
    () => mcpServers.filter((item) => item.status === 'connected').length,
    [mcpServers],
  )

  const startCreateAgent = () => {
    setEditingAgentId(null)
    setAgentForm(defaultAgentForm())
  }

  const startEditAgent = (agent: Agent) => {
    setEditingAgentId(agent.id)
    setAgentForm(mapAgentToForm(agent))
  }

  const saveAgent = () => {
    const trimmedName = agentForm.name.trim()
    if (!trimmedName) {
      return
    }

    if (editingAgentId) {
      setAgents(
        agents.map((item) =>
          item.id === editingAgentId
            ? {
                ...item,
                name: trimmedName,
                icon: agentForm.icon.trim() || '🤖',
                description: agentForm.description.trim(),
                role: agentForm.role,
                modelOverride: agentForm.modelOverride.trim() || undefined,
                systemPrompt: agentForm.systemPrompt.trim() || item.systemPrompt,
                enabled: agentForm.enabled,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      return
    }

    const now = new Date().toISOString()
    const newAgent: Agent = {
      id: createId('agent'),
      name: trimmedName,
      icon: agentForm.icon.trim() || '🤖',
      description: agentForm.description.trim(),
      type: 'custom',
      role: agentForm.role,
      enabled: agentForm.enabled,
      systemPrompt: agentForm.systemPrompt.trim() || '你是一个耐心、可靠的学习辅导助手。',
      promptVersion: 1,
      promptHistory: [],
      skillIds: [],
      mcpServerIds: [],
      modelOverride: agentForm.modelOverride.trim() || undefined,
      canDelete: true,
      createdAt: now,
      updatedAt: now,
    }

    setAgents([newAgent, ...agents])
    setActiveAgentId(newAgent.id)
    setEditingAgentId(newAgent.id)
    setAgentForm(mapAgentToForm(newAgent))
  }

  const removeAgent = (agent: Agent) => {
    if (!agent.canDelete) {
      return
    }

    const nextAgents = agents.filter((item) => item.id !== agent.id)
    setAgents(nextAgents)
    setEditingAgentId(null)
    setAgentForm(defaultAgentForm())

    if (resolvedActiveAgentId === agent.id) {
      setActiveAgentId(nextAgents[0]?.id ?? '')
    }
  }

  const toggleAgentEnabled = (agentId: string) => {
    setAgents(
      agents.map((item) =>
        item.id === agentId
          ? {
              ...item,
              enabled: !item.enabled,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    )
  }

  const toggleAgentSkill = (skillId: string) => {
    if (!activeAgent) {
      return
    }

    const exists = activeAgent.skillIds.includes(skillId)
    const nextSkillIds = exists
      ? activeAgent.skillIds.filter((item) => item !== skillId)
      : [...activeAgent.skillIds, skillId]

    setAgents(
      agents.map((item) =>
        item.id === activeAgent.id
          ? {
              ...item,
              skillIds: nextSkillIds,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    )
  }

  const toggleAgentMcp = (mcpServerId: string) => {
    if (!activeAgent) {
      return
    }

    const exists = activeAgent.mcpServerIds.includes(mcpServerId)
    const nextMcpServerIds = exists
      ? activeAgent.mcpServerIds.filter((item) => item !== mcpServerId)
      : [...activeAgent.mcpServerIds, mcpServerId]

    setAgents(
      agents.map((item) =>
        item.id === activeAgent.id
          ? {
              ...item,
              mcpServerIds: nextMcpServerIds,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    )
  }

  const saveSkill = () => {
    const trimmedName = skillForm.name.trim()
    const trimmedDisplayName = skillForm.displayName.trim()
    if (!trimmedName || !trimmedDisplayName) {
      return
    }

    if (editingSkillId) {
      setSkills(
        skills.map((item) =>
          item.id === editingSkillId
            ? {
                ...item,
                name: trimmedName,
                displayName: trimmedDisplayName,
                description: skillForm.description.trim(),
                type: skillForm.type,
              }
            : item,
        ),
      )
      return
    }

    const nextSkill: Skill = {
      id: createId('skill'),
      name: trimmedName,
      displayName: trimmedDisplayName,
      description: skillForm.description.trim(),
      type: skillForm.type,
      enabled: true,
    }

    setSkills([nextSkill, ...skills])
    setSkillForm(defaultSkillForm())
    setEditingSkillId(null)
  }

  const deleteSkill = (skillId: string) => {
    setSkills(skills.filter((item) => item.id !== skillId))
    setAgents(
      agents.map((item) => ({
        ...item,
        skillIds: item.skillIds.filter((id) => id !== skillId),
      })),
    )
  }

  const saveMcp = () => {
    const trimmedName = mcpForm.name.trim()
    const trimmedUrl = mcpForm.url.trim()
    if (!trimmedName || !trimmedUrl) {
      return
    }

    if (editingMcpId) {
      setMcpServers(
        mcpServers.map((item) =>
          item.id === editingMcpId
            ? {
                ...item,
                name: trimmedName,
                transport: mcpForm.transport,
                url: trimmedUrl,
                status: mcpForm.status,
              }
            : item,
        ),
      )
      return
    }

    const nextServer: McpServer = {
      id: createId('mcp'),
      name: trimmedName,
      transport: mcpForm.transport,
      url: trimmedUrl,
      status: mcpForm.status,
      discoveredTools: [],
      createdAt: new Date().toISOString(),
    }

    setMcpServers([nextServer, ...mcpServers])
    setMcpForm(defaultMcpForm())
    setEditingMcpId(null)
  }

  const deleteMcp = (serverId: string) => {
    setMcpServers(mcpServers.filter((item) => item.id !== serverId))
    setAgents(
      agents.map((item) => ({
        ...item,
        mcpServerIds: item.mcpServerIds.filter((id) => id !== serverId),
      })),
    )
  }

  return (
    <section className="page agent-page">
      <header className="model-header">
        <div>
          <h1 className="page__title page__title--with-icon">
            <Bot size={20} /> Agent 管理
          </h1>
          <p className="page__desc">管理 AI 助手的能力、提示词和工具连接，支持多 Agent 维护与持久化。</p>
        </div>
        <div className="model-metrics">
          <span className="badge">Agent {agents.length} 个</span>
          <span className="badge">启用 {enabledAgentCount} 个</span>
        </div>
      </header>

      <div className="agent-tabs" role="tablist" aria-label="Agent 维护标签页">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'agent'}
          className={`agent-tab${activeTab === 'agent' ? ' agent-tab--active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          <Bot size={14} /> Agent
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'skills'}
          className={`agent-tab${activeTab === 'skills' ? ' agent-tab--active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          <Puzzle size={14} /> Skills ({activeSkillCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mcp'}
          className={`agent-tab${activeTab === 'mcp' ? ' agent-tab--active' : ''}`}
          onClick={() => setActiveTab('mcp')}
        >
          <Plug size={14} /> MCP ({connectedMcpCount}/{mcpServers.length})
        </button>
      </div>

      {activeTab === 'agent' && (
        <div className="agent-layout">
          <article className="model-panel">
            <div className="model-panel__title">
              <Database size={18} /> Agent 列表
            </div>

            <div className="agent-list">
              {agents.map((agent) => {
                const isActive = agent.id === resolvedActiveAgentId

                return (
                  <button
                    key={agent.id}
                    className={`agent-card${isActive ? ' agent-card--active' : ''}${
                      agent.role === 'router' ? ' agent-card--router' : ''
                    }`}
                    type="button"
                    onClick={() => {
                      setActiveAgentId(agent.id)
                      setEditingAgentId(agent.id)
                      setAgentForm(mapAgentToForm(agent))
                    }}
                  >
                    <div className="agent-card__head">
                      <div className="agent-card__title-wrap">
                        <span className="agent-card__icon">{agent.icon || '🤖'}</span>
                        <strong>{agent.name}</strong>
                      </div>
                      <span className={`model-status-chip${agent.enabled ? ' model-status-chip--connected' : ''}`}>
                        {agent.enabled ? '已启用' : '已停用'}
                      </span>
                    </div>

                    <div className="agent-card__tags">
                      {agent.role === 'router' ? (
                        <span className="model-kind-pill">
                          <Route size={12} /> 路由
                        </span>
                      ) : (
                        <span className="model-kind-pill">
                          <Workflow size={12} /> 执行
                        </span>
                      )}
                      <span className="model-kind-pill">{agent.type === 'preset' ? '预置' : '自定义'}</span>
                      <span className="model-kind-pill">Skills {agent.skillIds.length}</span>
                      <span className="model-kind-pill">MCP {agent.mcpServerIds.length}</span>
                    </div>

                    <p className="agent-card__desc">{agent.description || '暂无描述'}</p>

                    <div className="agent-card__actions">
                      <button
                        className={`model-switch${agent.enabled ? ' model-switch--on' : ''}`}
                        type="button"
                        aria-pressed={agent.enabled}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleAgentEnabled(agent.id)
                        }}
                      >
                        <span className="model-switch__thumb" />
                      </button>

                      <div className="model-item__actions">
                        <button
                          className="model-icon-btn"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            startEditAgent(agent)
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        {agent.canDelete && (
                          <button
                            className="model-icon-btn model-icon-btn--danger"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              removeAgent(agent)
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}

              {agents.length === 0 && <div className="model-empty">暂无 Agent，请先新增。</div>}
            </div>

            <div className="model-vendor-actions">
              <button className="home-btn" type="button" onClick={startCreateAgent}>
                <Plus size={16} /> 新建 Agent
              </button>
            </div>
          </article>

          <article className="model-panel">
            <div className="model-panel__title">
              <Shield size={18} /> Agent 详情
            </div>

            {activeAgent ? (
              <>
                <div className="agent-detail-head">
                  <div className="agent-detail-head__title">
                    <span className="agent-detail-head__icon">{activeAgent.icon || '🤖'}</span>
                    <div>
                      <strong>{activeAgent.name}</strong>
                      <p>{activeAgent.description || '暂无描述'}</p>
                    </div>
                  </div>

                  <div className="model-provider-card__tags">
                    <span className="model-kind-pill">{activeAgent.type === 'preset' ? '预置' : '自定义'}</span>
                    <span className="model-kind-pill">v{activeAgent.promptVersion}</span>
                  </div>
                </div>

                <div className="model-editor-grid">
                  <label className="field">
                    <span className="field__label">Agent 名称</span>
                    <input
                      className="field__input"
                      value={agentForm.name}
                      onChange={(event) => setAgentForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="例如：作业批改助手"
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">图标</span>
                    <input
                      className="field__input"
                      value={agentForm.icon}
                      onChange={(event) => setAgentForm((prev) => ({ ...prev, icon: event.target.value }))}
                      placeholder="例如：📝"
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">角色</span>
                    <select
                      className="field__input"
                      value={agentForm.role}
                      onChange={(event) =>
                        setAgentForm((prev) => ({ ...prev, role: event.target.value as Agent['role'] }))
                      }
                    >
                      <option value="router">路由 Agent</option>
                      <option value="executor">执行 Agent</option>
                    </select>
                  </label>

                  <label className="field">
                    <span className="field__label">模型覆盖</span>
                    <input
                      className="field__input"
                      value={agentForm.modelOverride}
                      onChange={(event) =>
                        setAgentForm((prev) => ({ ...prev, modelOverride: event.target.value }))
                      }
                      placeholder="例如：gpt-4o-mini"
                    />
                  </label>

                  <label className="field field--full">
                    <span className="field__label">描述</span>
                    <input
                      className="field__input"
                      value={agentForm.description}
                      onChange={(event) =>
                        setAgentForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="例如：解析作业题目，输出讲解与分层练习"
                    />
                  </label>

                  <label className="field field--full">
                    <span className="field__label">系统提示词</span>
                    <textarea
                      className="field__textarea"
                      rows={8}
                      value={agentForm.systemPrompt}
                      onChange={(event) =>
                        setAgentForm((prev) => ({ ...prev, systemPrompt: event.target.value }))
                      }
                      placeholder="输入该 Agent 的系统提示词"
                    />
                  </label>
                </div>

                <div className="agent-binding-grid">
                  <div className="agent-binding-card">
                    <div className="agent-binding-card__title">
                      <Puzzle size={14} /> 已绑定 Skills ({activeAgentSkills.length})
                    </div>
                    {activeAgentSkills.length > 0 ? (
                      <div className="agent-chip-list">
                        {activeAgentSkills.map((skill) => (
                          <span key={skill.id} className="model-kind-pill">
                            {skill.displayName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="model-empty">暂无绑定 Skill</div>
                    )}
                  </div>

                  <div className="agent-binding-card">
                    <div className="agent-binding-card__title">
                      <Plug size={14} /> 已绑定 MCP ({activeAgentMcp.length})
                    </div>
                    {activeAgentMcp.length > 0 ? (
                      <div className="agent-chip-list">
                        {activeAgentMcp.map((server) => (
                          <span key={server.id} className="model-kind-pill">
                            {server.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="model-empty">暂无绑定 MCP</div>
                    )}
                  </div>
                </div>

                <div className="model-editor-actions model-editor-actions--compact">
                  <button className="home-btn" type="button" onClick={() => setAgentForm(mapAgentToForm(activeAgent))}>
                    重置
                  </button>
                  <button className="home-btn home-btn--primary" type="button" onClick={saveAgent}>
                    <Save size={16} /> 保存 Agent
                  </button>
                </div>
              </>
            ) : (
              <div className="model-empty">请选择左侧 Agent 查看详情。</div>
            )}
          </article>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="agent-layout agent-layout--single">
          <article className="model-panel">
            <div className="model-panel__title">
              <Puzzle size={18} /> Skills 维护
            </div>

            <div className="model-catalog-list">
              {skills.map((skill) => {
                const linked = activeAgent?.skillIds.includes(skill.id)

                return (
                  <div key={skill.id} className="model-item">
                    <div className="model-item__main">
                      <strong>{skill.displayName}</strong>
                      <span className="model-item__desc">{skill.description || '暂无说明'}</span>
                      <div className="model-item__meta">
                        <span className="model-kind-pill">{skill.name}</span>
                        <span className="model-kind-pill">{skill.type === 'builtin' ? '内置' : 'MCP'}</span>
                        {linked && <span className="model-status-chip model-status-chip--connected">已绑定当前 Agent</span>}
                      </div>
                    </div>

                    <div className="model-item__side">
                      {activeAgent && (
                        <button
                          className={`model-switch${linked ? ' model-switch--on' : ''}`}
                          type="button"
                          aria-pressed={linked}
                          onClick={() => toggleAgentSkill(skill.id)}
                        >
                          <span className="model-switch__thumb" />
                        </button>
                      )}

                      <div className="model-item__actions">
                        <button
                          className="model-icon-btn"
                          type="button"
                          onClick={() => {
                            setEditingSkillId(skill.id)
                            setSkillForm({
                              name: skill.name,
                              displayName: skill.displayName,
                              description: skill.description,
                              type: skill.type,
                            })
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button className="model-icon-btn model-icon-btn--danger" type="button" onClick={() => deleteSkill(skill.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="model-editor">
              <div className="model-editor__title">{editingSkillId ? '编辑 Skill' : '新增 Skill'}</div>

              <div className="model-editor-grid">
                <label className="field">
                  <span className="field__label">标识名</span>
                  <input
                    className="field__input"
                    value={skillForm.name}
                    onChange={(event) => setSkillForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="例如：homework_planner"
                  />
                </label>

                <label className="field">
                  <span className="field__label">显示名</span>
                  <input
                    className="field__input"
                    value={skillForm.displayName}
                    onChange={(event) =>
                      setSkillForm((prev) => ({ ...prev, displayName: event.target.value }))
                    }
                    placeholder="例如：作业规划"
                  />
                </label>

                <label className="field">
                  <span className="field__label">类型</span>
                  <select
                    className="field__input"
                    value={skillForm.type}
                    onChange={(event) =>
                      setSkillForm((prev) => ({ ...prev, type: event.target.value as Skill['type'] }))
                    }
                  >
                    <option value="builtin">内置</option>
                    <option value="mcp">MCP</option>
                  </select>
                </label>

                <label className="field field--full">
                  <span className="field__label">描述</span>
                  <input
                    className="field__input"
                    value={skillForm.description}
                    onChange={(event) =>
                      setSkillForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="描述 Skill 的作用和适用场景"
                  />
                </label>
              </div>

              <div className="model-editor-actions model-editor-actions--compact">
                <button
                  className="home-btn"
                  type="button"
                  onClick={() => {
                    setEditingSkillId(null)
                    setSkillForm(defaultSkillForm())
                  }}
                >
                  取消
                </button>
                <button className="home-btn home-btn--primary" type="button" onClick={saveSkill}>
                  <Save size={16} /> 保存 Skill
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {activeTab === 'mcp' && (
        <div className="agent-layout agent-layout--single">
          <article className="model-panel">
            <div className="model-panel__title">
              <Plug size={18} /> MCP Servers
            </div>

            <div className="model-catalog-list">
              {mcpServers.map((server) => {
                const linked = activeAgent?.mcpServerIds.includes(server.id)

                return (
                  <div key={server.id} className="model-item">
                    <div className="model-item__main">
                      <strong>{server.name}</strong>
                      <span className="model-item__desc">{server.url}</span>
                      <div className="model-item__meta">
                        <span className="model-kind-pill">{server.transport.toUpperCase()}</span>
                        <span className={`model-status-chip${server.status === 'connected' ? ' model-status-chip--connected' : ''}`}>
                          {server.status === 'connected' ? '已连接' : server.status === 'error' ? '异常' : '未连接'}
                        </span>
                        <span className="model-kind-pill">Tools {server.discoveredTools.length}</span>
                        {linked && <span className="model-status-chip model-status-chip--connected">已绑定当前 Agent</span>}
                      </div>
                    </div>

                    <div className="model-item__side">
                      {activeAgent && (
                        <button
                          className={`model-switch${linked ? ' model-switch--on' : ''}`}
                          type="button"
                          aria-pressed={linked}
                          onClick={() => toggleAgentMcp(server.id)}
                        >
                          <span className="model-switch__thumb" />
                        </button>
                      )}

                      <div className="model-item__actions">
                        <button
                          className="model-icon-btn"
                          type="button"
                          onClick={() => {
                            setEditingMcpId(server.id)
                            setMcpForm({
                              name: server.name,
                              transport: server.transport,
                              url: server.url,
                              status: server.status,
                            })
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="model-icon-btn model-icon-btn--danger"
                          type="button"
                          onClick={() => deleteMcp(server.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="model-editor">
              <div className="model-editor__title">{editingMcpId ? '编辑 MCP' : '新增 MCP'}</div>

              <div className="model-editor-grid">
                <label className="field">
                  <span className="field__label">名称</span>
                  <input
                    className="field__input"
                    value={mcpForm.name}
                    onChange={(event) => setMcpForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="例如：知识检索服务"
                  />
                </label>

                <label className="field">
                  <span className="field__label">传输协议</span>
                  <select
                    className="field__input"
                    value={mcpForm.transport}
                    onChange={(event) =>
                      setMcpForm((prev) => ({ ...prev, transport: event.target.value as McpServer['transport'] }))
                    }
                  >
                    <option value="sse">SSE</option>
                    <option value="stdio">STDIO</option>
                  </select>
                </label>

                <label className="field field--full">
                  <span className="field__label">URL / 命令</span>
                  <input
                    className="field__input"
                    value={mcpForm.url}
                    onChange={(event) => setMcpForm((prev) => ({ ...prev, url: event.target.value }))}
                    placeholder="http://127.0.0.1:7701/sse"
                  />
                </label>

                <label className="field">
                  <span className="field__label">连接状态</span>
                  <select
                    className="field__input"
                    value={mcpForm.status}
                    onChange={(event) =>
                      setMcpForm((prev) => ({ ...prev, status: event.target.value as McpServer['status'] }))
                    }
                  >
                    <option value="disconnected">未连接</option>
                    <option value="connected">已连接</option>
                    <option value="error">异常</option>
                  </select>
                </label>
              </div>

              <div className="model-editor-actions model-editor-actions--compact">
                <button
                  className="home-btn"
                  type="button"
                  onClick={() => {
                    setEditingMcpId(null)
                    setMcpForm(defaultMcpForm())
                  }}
                >
                  取消
                </button>
                <button className="home-btn home-btn--primary" type="button" onClick={saveMcp}>
                  <Save size={16} /> 保存 MCP
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      <footer className="agent-footer-hint">
        <span className="statusbar__item">
          {connectedMcpCount > 0 ? <CheckCircle2 size={14} /> : <Circle size={14} />} {agents.length} Agents ·{' '}
          {activeSkillCount} Skills · {connectedMcpCount} MCP 已连接
        </span>
      </footer>
    </section>
  )
}
