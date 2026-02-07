import { useEffect, useMemo, useState } from 'react'
import {
  BrainCircuit,
  CheckCircle2,
  Circle,
  Database,
  Pencil,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useModelStore } from '../../stores/useModelStore'
import {
  ProviderType,
  type AuthScheme,
  type ManagedModel,
  type ModelKind,
  type Provider,
  type ProviderModelMap,
  type ProviderProtocol,
} from '../../types'
import {
  loadProviderModelsSnapshot,
  loadProviderSnapshot,
  saveProviderModelsSnapshot,
  saveProviderSnapshot,
} from '../../services/persistence/modelPersistence'

type ModelForm = {
  name: string
  kind: ModelKind
  temperature: number
  description: string
}

type VendorForm = {
  id?: string
  name: string
  type: ProviderType
  protocol: ProviderProtocol
  baseUrl: string
  chatPath: string
  embeddingPath: string
  authScheme: AuthScheme
  customHeaderName: string
  apiKey: string
}

const providerTemplates: Provider[] = [
  {
    id: 'provider-anthropic',
    name: 'Anthropic',
    type: ProviderType.ANTHROPIC,
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    enabled: true,
    status: 'untested',
    protocol: 'anthropic-messages',
    authScheme: 'x-api-key',
    chatPath: '/v1/messages',
    embeddingPath: '/v1/embeddings',
    createdAt: '2026-02-06T00:00:00.000Z',
  },
  {
    id: 'provider-openai',
    name: 'OpenAI',
    type: ProviderType.OPENAI,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    enabled: true,
    status: 'untested',
    protocol: 'openai-compatible',
    authScheme: 'bearer',
    chatPath: '/chat/completions',
    embeddingPath: '/embeddings',
    createdAt: '2026-02-06T00:00:00.000Z',
  },
  {
    id: 'provider-custom',
    name: '自定义厂商',
    type: ProviderType.CUSTOM,
    baseUrl: 'https://api.custom-llm.com/v1',
    apiKey: '',
    enabled: true,
    status: 'untested',
    protocol: 'custom-http',
    authScheme: 'custom-header',
    chatPath: '/chat',
    embeddingPath: '/embedding',
    customHeaderName: 'X-API-Key',
    createdAt: '2026-02-06T00:00:00.000Z',
  },
]

const providerModelTemplates: Record<ProviderType, ManagedModel[]> = {
  [ProviderType.ANTHROPIC]: [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'claude-sonnet-4-20250514',
      kind: '通用模型',
      temperature: 0.4,
      enabled: false,
      description: '日常对话与复杂推理',
    },
    {
      id: 'text-embedding-3-small',
      name: 'text-embedding-3-small',
      kind: '嵌入模型',
      temperature: 0,
      enabled: false,
      description: '知识库向量检索',
    },
  ],
  [ProviderType.OPENAI]: [
    {
      id: 'gpt-4o',
      name: 'gpt-4o',
      kind: '通用模型',
      temperature: 0.4,
      enabled: false,
      description: '全能对话模型',
    },
    {
      id: 'text-embedding-3-small',
      name: 'text-embedding-3-small',
      kind: '嵌入模型',
      temperature: 0,
      enabled: false,
      description: '通用嵌入模型',
    },
  ],
  [ProviderType.DEEPSEEK]: [
    {
      id: 'deepseek-chat',
      name: 'deepseek-chat',
      kind: '通用模型',
      temperature: 0.5,
      enabled: false,
      description: '中文任务表现稳定',
    },
  ],
  [ProviderType.GOOGLE]: [
    {
      id: 'gemini-2.5-flash',
      name: 'gemini-2.5-flash',
      kind: '通用模型',
      temperature: 0.4,
      enabled: false,
      description: '高性价比通用模型',
    },
  ],
  [ProviderType.YI]: [
    {
      id: 'yi-lightning',
      name: 'yi-lightning',
      kind: '通用模型',
      temperature: 0.5,
      enabled: false,
      description: '低延迟对话模型',
    },
  ],
  [ProviderType.CUSTOM]: [],
}

const protocolOptions: Array<{ value: ProviderProtocol; label: string }> = [
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
  { value: 'google-genai', label: 'Google GenAI' },
  { value: 'custom-http', label: 'Custom HTTP' },
]

const authOptions: Array<{ value: AuthScheme; label: string }> = [
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'x-api-key', label: 'X-API-Key' },
  { value: 'custom-header', label: 'Custom Header' },
]

function cloneTemplate(providerType: ProviderType) {
  return (providerModelTemplates[providerType] ?? []).map((item) => ({ ...item }))
}

function createModelId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `model-${crypto.randomUUID()}`
  }

  return `model-${Date.now()}`
}

function createProviderId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `provider-${crypto.randomUUID()}`
  }

  return `provider-${Date.now()}`
}

function createProviderDefaults(type: ProviderType): Omit<VendorForm, 'id' | 'apiKey'> {
  if (type === ProviderType.ANTHROPIC) {
    return {
      name: 'Anthropic',
      type,
      protocol: 'anthropic-messages',
      baseUrl: 'https://api.anthropic.com',
      chatPath: '/v1/messages',
      embeddingPath: '/v1/embeddings',
      authScheme: 'x-api-key',
      customHeaderName: 'x-api-key',
    }
  }

  if (type === ProviderType.GOOGLE) {
    return {
      name: 'Google',
      type,
      protocol: 'google-genai',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      chatPath: '/models/{model}:generateContent',
      embeddingPath: '/models/text-embedding-004:embedContent',
      authScheme: 'x-api-key',
      customHeaderName: 'x-goog-api-key',
    }
  }

  if (type === ProviderType.DEEPSEEK) {
    return {
      name: 'DeepSeek',
      type,
      protocol: 'openai-compatible',
      baseUrl: 'https://api.deepseek.com/v1',
      chatPath: '/chat/completions',
      embeddingPath: '/embeddings',
      authScheme: 'bearer',
      customHeaderName: 'Authorization',
    }
  }

  if (type === ProviderType.YI) {
    return {
      name: '零一万物',
      type,
      protocol: 'openai-compatible',
      baseUrl: 'https://api.lingyiwanwu.com/v1',
      chatPath: '/chat/completions',
      embeddingPath: '/embeddings',
      authScheme: 'bearer',
      customHeaderName: 'Authorization',
    }
  }

  if (type === ProviderType.CUSTOM) {
    return {
      name: '自定义厂商',
      type,
      protocol: 'custom-http',
      baseUrl: 'https://api.custom-llm.com/v1',
      chatPath: '/chat',
      embeddingPath: '/embedding',
      authScheme: 'custom-header',
      customHeaderName: 'X-API-Key',
    }
  }

  return {
    name: 'OpenAI',
    type,
    protocol: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    chatPath: '/chat/completions',
    embeddingPath: '/embeddings',
    authScheme: 'bearer',
    customHeaderName: 'Authorization',
  }
}

function defaultModelForm(kind: ModelKind = '通用模型'): ModelForm {
  return {
    name: '',
    kind,
    temperature: kind === '通用模型' ? 0.4 : 0,
    description: '',
  }
}

function mapProviderModelsByCurrentProviders(
  providers: Provider[],
  storedMap: ProviderModelMap,
): ProviderModelMap {
  return providers.reduce<ProviderModelMap>((acc, provider) => {
    const existing = storedMap[provider.id]
    acc[provider.id] = existing ? existing : cloneTemplate(provider.type)
    return acc
  }, {})
}

function mapProviderToVendorForm(provider: Provider): VendorForm {
  const defaults = createProviderDefaults(provider.type)

  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    protocol: provider.protocol ?? defaults.protocol,
    baseUrl: provider.baseUrl,
    chatPath: provider.chatPath ?? defaults.chatPath,
    embeddingPath: provider.embeddingPath ?? defaults.embeddingPath,
    authScheme: provider.authScheme ?? defaults.authScheme,
    customHeaderName: provider.customHeaderName ?? defaults.customHeaderName,
    apiKey: provider.apiKey,
  }
}

export function ModelPage() {
  const { providers, setProviders } = useModelStore()
  const [initialized, setInitialized] = useState(false)
  const [activeProviderId, setActiveProviderId] = useState('')
  const [providerModels, setProviderModels] = useState<ProviderModelMap>({})
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [modelForm, setModelForm] = useState<ModelForm>(() => defaultModelForm())
  const [vendorForm, setVendorForm] = useState<VendorForm>(() => {
    const defaults = createProviderDefaults(ProviderType.CUSTOM)
    return { ...defaults, apiKey: '' }
  })

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const [storedProviders, storedModels] = await Promise.all([
        loadProviderSnapshot(),
        loadProviderModelsSnapshot(),
      ])

      if (!active) {
        return
      }

      const nextProviders = storedProviders.length > 0 ? storedProviders : providerTemplates
      setProviders(nextProviders)
      setProviderModels(mapProviderModelsByCurrentProviders(nextProviders, storedModels))
      setInitialized(true)
    }

    void initialize()

    return () => {
      active = false
    }
  }, [setProviders])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveProviderSnapshot(providers)
  }, [initialized, providers])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveProviderModelsSnapshot(providerModels)
  }, [initialized, providerModels])

  useEffect(() => {
    if (providers.length === 0) {
      return
    }

    if (!activeProviderId || !providers.some((provider) => provider.id === activeProviderId)) {
      setActiveProviderId(providers[0].id)
    }
  }, [activeProviderId, providers])

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === activeProviderId) ?? providers[0],
    [activeProviderId, providers],
  )

  useEffect(() => {
    if (!activeProvider) {
      return
    }

    setVendorForm(mapProviderToVendorForm(activeProvider))
  }, [activeProvider])

  useEffect(() => {
    if (!activeProvider) {
      return
    }

    setProviderModels((prev) => {
      if (prev[activeProvider.id]) {
        return prev
      }

      return {
        ...prev,
        [activeProvider.id]: cloneTemplate(activeProvider.type),
      }
    })
  }, [activeProvider])

  useEffect(() => {
    if (!initialized || providers.length === 0) {
      return
    }

    setProviderModels((prev) => mapProviderModelsByCurrentProviders(providers, prev))
  }, [initialized, providers])

  const models = activeProvider ? providerModels[activeProvider.id] ?? [] : []

  const enabledCount = useMemo(() => models.filter((item) => item.enabled).length, [models])

  const editingModel = useMemo(
    () => models.find((item) => item.id === editingModelId) ?? null,
    [editingModelId, models],
  )

  useEffect(() => {
    if (!editingModel) {
      return
    }

    setModelForm({
      name: editingModel.name,
      kind: editingModel.kind,
      temperature: editingModel.temperature,
      description: editingModel.description,
    })
  }, [editingModel])

  const resetModelForm = () => {
    setEditingModelId(null)
    setModelForm(defaultModelForm())
  }

  const handleStartCreateVendor = () => {
    const defaults = createProviderDefaults(ProviderType.CUSTOM)
    setActiveProviderId('')
    setVendorForm({
      ...defaults,
      id: undefined,
      apiKey: '',
    })
  }

  const handleSaveVendor = () => {
    const trimmedName = vendorForm.name.trim()
    const trimmedBaseUrl = vendorForm.baseUrl.trim()

    if (!trimmedName || !trimmedBaseUrl) {
      return
    }

    if (vendorForm.id) {
      const updatedProviders = providers.map((provider) =>
        provider.id === vendorForm.id
          ? {
              ...provider,
              name: trimmedName,
              type: vendorForm.type,
              baseUrl: trimmedBaseUrl,
              apiKey: vendorForm.apiKey,
              protocol: vendorForm.protocol,
              authScheme: vendorForm.authScheme,
              chatPath: vendorForm.chatPath,
              embeddingPath: vendorForm.embeddingPath,
              customHeaderName: vendorForm.customHeaderName,
            }
          : provider,
      )

      setProviders(updatedProviders)
      return
    }

    const newProviderId = createProviderId()
    const nextProvider: Provider = {
      id: newProviderId,
      name: trimmedName,
      type: vendorForm.type,
      baseUrl: trimmedBaseUrl,
      apiKey: vendorForm.apiKey,
      enabled: true,
      status: 'untested',
      protocol: vendorForm.protocol,
      authScheme: vendorForm.authScheme,
      chatPath: vendorForm.chatPath,
      embeddingPath: vendorForm.embeddingPath,
      customHeaderName: vendorForm.customHeaderName,
      createdAt: new Date().toISOString(),
    }

    setProviders([...providers, nextProvider])
    setActiveProviderId(newProviderId)

    setProviderModels((prev) => ({
      ...prev,
      [newProviderId]: cloneTemplate(vendorForm.type),
    }))

    setVendorForm({
      ...vendorForm,
      id: newProviderId,
    })
  }

  const handleDeleteVendor = () => {
    if (!activeProvider) {
      return
    }

    const nextProviders = providers.filter((provider) => provider.id !== activeProvider.id)
    setProviders(nextProviders)

    setProviderModels((prev) => {
      const { [activeProvider.id]: _removed, ...rest } = prev
      return rest
    })

    if (nextProviders.length > 0) {
      setActiveProviderId(nextProviders[0].id)
      return
    }

    handleStartCreateVendor()
  }

  const handleProviderTypeChange = (value: ProviderType) => {
    const defaults = createProviderDefaults(value)
    setVendorForm((prev) => ({
      ...prev,
      type: value,
      protocol: defaults.protocol,
      authScheme: defaults.authScheme,
      chatPath: defaults.chatPath,
      embeddingPath: defaults.embeddingPath,
      customHeaderName: defaults.customHeaderName,
      baseUrl: prev.id ? prev.baseUrl : defaults.baseUrl,
      name: prev.id ? prev.name : defaults.name,
    }))
  }

  const handleStartEditModel = (model: ManagedModel) => {
    setEditingModelId(model.id)
  }

  const handleDeleteModel = (modelId: string) => {
    if (!activeProvider) {
      return
    }

    setProviderModels((prev) => ({
      ...prev,
      [activeProvider.id]: (prev[activeProvider.id] ?? []).filter((item) => item.id !== modelId),
    }))

    if (editingModelId === modelId) {
      resetModelForm()
    }
  }

  const handleToggleModel = (modelId: string) => {
    if (!activeProvider) {
      return
    }

    setProviderModels((prev) => ({
      ...prev,
      [activeProvider.id]: (prev[activeProvider.id] ?? []).map((item) =>
        item.id === modelId
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item,
      ),
    }))
  }

  const handleSaveModel = () => {
    if (!activeProvider) {
      return
    }

    const trimmedName = modelForm.name.trim()
    if (!trimmedName) {
      return
    }

    const normalizedTemperature = Number.isFinite(modelForm.temperature)
      ? Math.max(0, Math.min(2, Number(modelForm.temperature)))
      : 0

    setProviderModels((prev) => {
      const current = prev[activeProvider.id] ?? []

      if (editingModelId) {
        return {
          ...prev,
          [activeProvider.id]: current.map((item) =>
            item.id === editingModelId
              ? {
                  ...item,
                  name: trimmedName,
                  kind: modelForm.kind,
                  temperature: normalizedTemperature,
                  description: modelForm.description.trim(),
                }
              : item,
          ),
        }
      }

      const nextItem: ManagedModel = {
        id: createModelId(),
        name: trimmedName,
        kind: modelForm.kind,
        temperature: normalizedTemperature,
        enabled: false,
        description: modelForm.description.trim(),
      }

      return {
        ...prev,
        [activeProvider.id]: [...current, nextItem],
      }
    })

    resetModelForm()
  }

  return (
    <section className="page model-page model-page--two-col">
      <header className="model-header">
        <div>
          <h1 className="page__title page__title--with-icon">
            <BrainCircuit size={20} />
            模型维护
          </h1>
          <p className="page__desc">厂商支持新增与协议预留，模型支持增删改查、类型与温度配置。</p>
        </div>
        <div className="model-metrics">
          <span className="badge">厂商 {providers.length} 个</span>
          <span className="badge">当前启用模型 {enabledCount} 个</span>
        </div>
      </header>

      <div className="model-layout model-layout--compact">
        <article className="model-panel">
          <div className="model-panel__title">
            <Database size={18} /> 模型厂商
          </div>

          <div className="model-provider-list model-provider-list--flat">
            {providers.map((provider) => {
              const active = provider.id === activeProvider?.id

              return (
                <button
                  key={provider.id}
                  className={`model-provider-card${active ? ' model-provider-card--active' : ''}`}
                  type="button"
                  onClick={() => {
                    setActiveProviderId(provider.id)
                    resetModelForm()
                  }}
                >
                  <div className="model-provider-card__head">
                    <strong>{provider.name}</strong>
                    {active ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  </div>
                  <span className="model-provider-card__meta">{provider.baseUrl}</span>
                </button>
              )
            })}
          </div>

          <div className="model-vendor-form">
            <div className="model-vendor-form__title">
              <Settings2 size={16} /> {vendorForm.id ? '编辑厂商' : '新增厂商'}
            </div>

            <div className="model-vendor-grid">
              <label className="field">
                <span className="field__label">厂商名称</span>
                <input
                  className="field__input"
                  value={vendorForm.name}
                  onChange={(event) =>
                    setVendorForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="例如：自建网关"
                />
              </label>

              <label className="field">
                <span className="field__label">厂商类型</span>
                <select
                  className="field__input"
                  value={vendorForm.type}
                  onChange={(event) => handleProviderTypeChange(event.target.value as ProviderType)}
                >
                  <option value={ProviderType.OPENAI}>OpenAI</option>
                  <option value={ProviderType.ANTHROPIC}>Anthropic</option>
                  <option value={ProviderType.GOOGLE}>Google</option>
                  <option value={ProviderType.DEEPSEEK}>DeepSeek</option>
                  <option value={ProviderType.YI}>零一万物</option>
                  <option value={ProviderType.CUSTOM}>自定义厂商</option>
                </select>
              </label>

              <label className="field">
                <span className="field__label">协议类型</span>
                <select
                  className="field__input"
                  value={vendorForm.protocol}
                  onChange={(event) =>
                    setVendorForm((prev) => ({ ...prev, protocol: event.target.value as ProviderProtocol }))
                  }
                >
                  {protocolOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">鉴权方式</span>
                <select
                  className="field__input"
                  value={vendorForm.authScheme}
                  onChange={(event) =>
                    setVendorForm((prev) => ({ ...prev, authScheme: event.target.value as AuthScheme }))
                  }
                >
                  {authOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">Base URL</span>
                <input
                  className="field__input"
                  value={vendorForm.baseUrl}
                  onChange={(event) =>
                    setVendorForm((prev) => ({ ...prev, baseUrl: event.target.value }))
                  }
                  placeholder="https://api.example.com"
                />
              </label>

              <label className="field">
                <span className="field__label">Chat Path</span>
                <input
                  className="field__input"
                  value={vendorForm.chatPath}
                  onChange={(event) =>
                    setVendorForm((prev) => ({ ...prev, chatPath: event.target.value }))
                  }
                  placeholder="/chat/completions"
                />
              </label>

              <label className="field">
                <span className="field__label">Embedding Path</span>
                <input
                  className="field__input"
                  value={vendorForm.embeddingPath}
                  onChange={(event) =>
                    setVendorForm((prev) => ({ ...prev, embeddingPath: event.target.value }))
                  }
                  placeholder="/embeddings"
                />
              </label>

              <label className="field">
                <span className="field__label">自定义 Header</span>
                <input
                  className="field__input"
                  value={vendorForm.customHeaderName}
                  onChange={(event) =>
                    setVendorForm((prev) => ({ ...prev, customHeaderName: event.target.value }))
                  }
                  placeholder="X-API-Key"
                />
              </label>

              <label className="field model-vendor-grid__full">
                <span className="field__label">API Key</span>
                <input
                  className="field__input"
                  type="password"
                  value={vendorForm.apiKey}
                  onChange={(event) =>
                    setVendorForm((prev) => ({ ...prev, apiKey: event.target.value }))
                  }
                  placeholder="输入用于请求厂商的密钥"
                />
              </label>
            </div>

            <div className="model-vendor-actions">
              <button className="home-btn" type="button" onClick={handleStartCreateVendor}>
                <Plus size={16} /> 新增厂商
              </button>
              {activeProvider && (
                <button className="home-btn model-btn-danger" type="button" onClick={handleDeleteVendor}>
                  <Trash2 size={16} /> 删除厂商
                </button>
              )}
              <button className="home-btn home-btn--primary" type="button" onClick={handleSaveVendor}>
                <Save size={16} /> 保存厂商
              </button>
            </div>
          </div>
        </article>

        <article className="model-panel">
          <div className="model-panel__title">
            <ShieldCheck size={18} /> 模型列表
          </div>

          <div className="model-list-toolbar">
            <span className="model-list-hint">当前厂商：{activeProvider?.name ?? '未选择'}</span>
            <button className="home-btn" type="button" onClick={resetModelForm}>
              <Plus size={16} /> 新增模型
            </button>
          </div>

          <div className="model-catalog-list">
            {models.map((model) => (
              <div key={model.id} className="model-item">
                <div className="model-item__main">
                  <strong>{model.name}</strong>
                  <span className="model-item__desc">{model.description || '暂无描述'}</span>
                  <div className="model-item__meta">
                    <span className="model-kind-pill">{model.kind}</span>
                    <span className="model-kind-pill">温度 {model.temperature.toFixed(1)}</span>
                  </div>
                </div>

                <div className="model-item__side">
                  <button
                    className={`model-switch${model.enabled ? ' model-switch--on' : ''}`}
                    type="button"
                    aria-pressed={model.enabled}
                    onClick={() => handleToggleModel(model.id)}
                  >
                    <span className="model-switch__thumb" />
                  </button>

                  <div className="model-item__actions">
                    <button
                      className="model-icon-btn"
                      type="button"
                      onClick={() => handleStartEditModel(model)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="model-icon-btn model-icon-btn--danger"
                      type="button"
                      onClick={() => handleDeleteModel(model.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {models.length === 0 && <div className="model-empty">当前厂商暂无模型，请新增。</div>}
          </div>

          <div className="model-editor">
            <div className="model-editor__title">{editingModelId ? '编辑模型' : '新增模型'}</div>

            <div className="model-editor-grid">
              <label className="field">
                <span className="field__label">模型名称</span>
                <input
                  className="field__input"
                  value={modelForm.name}
                  onChange={(event) => setModelForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="例如：gpt-4o-mini"
                />
              </label>

              <label className="field">
                <span className="field__label">模型类型</span>
                <select
                  className="field__input"
                  value={modelForm.kind}
                  onChange={(event) => {
                    const nextKind = event.target.value as ModelKind
                    setModelForm((prev) => ({
                      ...prev,
                      kind: nextKind,
                      temperature: nextKind === '嵌入模型' ? 0 : prev.temperature,
                    }))
                  }}
                >
                  <option value="通用模型">通用模型</option>
                  <option value="嵌入模型">嵌入模型</option>
                </select>
              </label>

              <label className="field">
                <span className="field__label">温度</span>
                <input
                  className="field__input"
                  type="number"
                  step={0.1}
                  min={0}
                  max={2}
                  value={modelForm.temperature}
                  onChange={(event) =>
                    setModelForm((prev) => ({ ...prev, temperature: Number(event.target.value) || 0 }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">描述</span>
                <input
                  className="field__input"
                  value={modelForm.description}
                  onChange={(event) =>
                    setModelForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="例如：作业讲解场景"
                />
              </label>
            </div>

            <div className="model-editor-actions model-editor-actions--compact">
              <button className="home-btn" type="button" onClick={resetModelForm}>
                取消
              </button>
              <button className="home-btn home-btn--primary" type="button" onClick={handleSaveModel}>
                <Save size={16} /> 保存模型
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
