# 小智辅导 — MVP 技术架构 v2

> **核心原则**：纯本地客户端 + 外部 API。无服务端、无 Python、无本地模型。

---

## 一、技术选型

| 维度 | 选型 | 决策原因 |
|------|------|---------|
| 桌面框架 | **Tauri v2** | 安装包 <30MB (Electron 150MB+)，内存占用低，Rust 安全性 |
| 前端框架 | **React 18 + TypeScript** | 组件生态最丰富，团队熟悉度高 |
| 包管理 | **Bun** | 安装速度快 3-5x，原生支持 TS，单一工具链 |
| 样式 | **Tailwind CSS 4** | 快速迭代，原子化 CSS |
| UI 组件 | **shadcn/ui** | 可定制、现代、不依赖重型组件库 |
| 状态管理 | **Zustand** | 零样板、轻量、适合中小应用 |
| 路由 | **React Router v7** | 标准选择 |
| 本地数据库 | **SQLite** (Tauri sql-plugin) | Tauri 原生支持，结构化查询 |
| 安全存储 | **Tauri Stronghold** | API Key 等敏感信息加密存储 |
| 向量存储 | **Supabase pgvector** (主) / **orama** (备选) | Supabase 免费层 500MB；orama 纯 JS 可离线 |
| LLM 调用 | **直接调各厂商 REST API** | 纯 TS fetch，不需要 SDK 依赖 |
| Embedding | **外部 API** (OpenAI / Voyage) | 无本地模型依赖 |
| PDF 解析 | **pdfjs-dist** | 纯 JS，久经考验 |
| DOCX 解析 | **mammoth** | 轻量，Markdown 输出 |
| OCR | **多模态 LLM API** | 发送图片给 GPT-4o/Claude，准确率远超 tesseract.js |
| Markdown 渲染 | **react-markdown + remark-math + rehype-katex** | 支持公式 |
| 拖拽 | **@dnd-kit/core** | 现代、轻量、维护活跃 |
| 代码编辑 | **@monaco-editor/react** | Prompt 编辑器，VS Code 同款 |
| 打包 | **Tauri 内置** | 自动生成 exe/msi/dmg |

---

## 二、进程架构

```
┌─────────────────────────────────────────────────────────────┐
│                   Tauri Application                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  WebView (Renderer)                                    │  │
│  │  React 18 + TypeScript + Tailwind + shadcn/ui          │  │
│  │                                                        │  │
│  │  Pages: 对话 / 知识库 / 任务 / Agent管理 / 模型管理 / 设置 │  │
│  │  Stores: Zustand (chat / kb / task / agent / model)    │  │
│  │  Services: LLM调用 / RAG / Embedding / OCR             │  │
│  └───────────────────┬────────────────────────────────────┘  │
│                      │ Tauri Commands (invoke)                │
│  ┌───────────────────▼────────────────────────────────────┐  │
│  │  Rust Core (Tauri Backend)                             │  │
│  │  ├── SQLite (sql-plugin) — 结构化数据持久化             │  │
│  │  ├── Stronghold — API Key 加密存储                     │  │
│  │  ├── fs-plugin — 本地文件读写                          │  │
│  │  ├── notification-plugin — 桌面通知                    │  │
│  │  ├── shell-plugin — 外部进程(可选 MCP stdio)           │  │
│  │  └── http-plugin — 网络请求代理(绕过 CORS)             │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
   │ LLM APIs    │    │ Embedding    │    │ Vector DB    │
   │ Claude      │    │ APIs         │    │ Supabase     │
   │ GPT-4o      │    │ OpenAI       │    │ pgvector     │
   │ Gemini      │    │ Voyage       │    │              │
   │ DeepSeek    │    │ Cohere       │    │ (or orama    │
   │ ...         │    │ ...          │    │  local)      │
   └─────────────┘    └──────────────┘    └──────────────┘
```

**关键：没有第二个进程。** 所有逻辑在 Tauri 单进程内完成。LLM/Embedding/Vector 全部通过 HTTPS 调外部 API。Rust 层只处理文件 I/O、数据库和系统级操作。

---

## 三、目录结构

```
xiaozhi-tutor/
├── src-tauri/                      # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs                 # 入口
│   │   ├── commands/               # Tauri Commands
│   │   │   ├── db.rs               # SQLite CRUD
│   │   │   ├── file.rs             # 文件操作
│   │   │   └── secure_store.rs     # API Key 加密读写
│   │   └── scheduler.rs            # 任务提醒定时器
│   ├── migrations/                 # SQLite 迁移
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                            # React 前端
│   ├── App.tsx
│   ├── router.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # 整体布局
│   │   │   ├── Sidebar.tsx         # 左侧导航
│   │   │   └── StatusBar.tsx       # 底部状态栏
│   │   │
│   │   ├── chat/                   # 对话模块
│   │   │   ├── ChatPage.tsx        # 页面容器
│   │   │   ├── ChatSidebar.tsx     # 对话列表侧栏
│   │   │   ├── ChatWindow.tsx      # 消息区
│   │   │   ├── MessageBubble.tsx   # 消息气泡
│   │   │   ├── MessageInput.tsx    # 输入框(文本+文件)
│   │   │   ├── StreamRenderer.tsx  # 流式 Markdown 渲染
│   │   │   ├── KBSelector.tsx      # 知识库关联选择器
│   │   │   ├── ModeSwitch.tsx      # 家长/孩子模式
│   │   │   ├── ModelBadge.tsx      # 当前模型显示+切换
│   │   │   └── RoutingIndicator.tsx # Agent 路由指示器
│   │   │
│   │   ├── kb/                     # 知识库模块
│   │   │   ├── KBPage.tsx
│   │   │   ├── KBCard.tsx          # 知识库卡片
│   │   │   ├── KBCreateModal.tsx   # 创建弹窗
│   │   │   ├── DocUpload.tsx       # 文件拖拽上传
│   │   │   └── DocProgress.tsx     # 处理进度
│   │   │
│   │   ├── task/                   # 任务模块
│   │   │   ├── TaskPage.tsx
│   │   │   ├── TaskBoard.tsx       # 三列看板
│   │   │   ├── TaskCard.tsx        # 任务卡片(可拖拽)
│   │   │   ├── TaskCreateModal.tsx
│   │   │   └── TaskStats.tsx       # 统计概览
│   │   │
│   │   ├── agent/                  # Agent 管理模块
│   │   │   ├── AgentPage.tsx       # Agent 列表页
│   │   │   ├── AgentCard.tsx       # Agent 卡片
│   │   │   ├── AgentDetail.tsx     # Agent 详情(Tab容器)
│   │   │   ├── PromptEditor.tsx    # Prompt 编辑器(Monaco)
│   │   │   ├── PromptPreview.tsx   # 变量替换预览
│   │   │   ├── SkillList.tsx       # Skills 列表
│   │   │   ├── McpManager.tsx      # MCP Server 管理
│   │   │   └── AgentCreateModal.tsx
│   │   │
│   │   ├── model/                  # 模型管理模块
│   │   │   ├── ModelPage.tsx       # 模型管理页
│   │   │   ├── ProviderCard.tsx    # Provider 卡片
│   │   │   ├── ProviderForm.tsx    # Provider 配置表单
│   │   │   ├── ModelSelector.tsx   # 默认模型选择
│   │   │   └── ConnectionTest.tsx  # 连接测试组件
│   │   │
│   │   ├── settings/               # 设置模块
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── ChildInfo.tsx
│   │   │   ├── VectorDBConfig.tsx  # 向量库配置
│   │   │   ├── ThemeConfig.tsx
│   │   │   └── DataManagement.tsx
│   │   │
│   │   └── onboarding/             # 引导流程
│   │       └── OnboardingWizard.tsx
│   │
│   ├── services/                   # 业务服务层(纯 TS)
│   │   ├── llm/
│   │   │   ├── llmClient.ts        # 统一 LLM 调用接口
│   │   │   ├── providers/
│   │   │   │   ├── openai.ts       # OpenAI API 实现
│   │   │   │   ├── anthropic.ts    # Anthropic API 实现
│   │   │   │   ├── google.ts       # Gemini API 实现
│   │   │   │   └── openaiCompat.ts # OpenAI 兼容(DeepSeek/YI等)
│   │   │   └── types.ts
│   │   │
│   │   ├── agent/
│   │   │   ├── agentRuntime.ts     # Agent 执行引擎
│   │   │   ├── routerAgent.ts      # Router Agent 路由逻辑
│   │   │   ├── skillExecutor.ts    # Skill 执行器
│   │   │   └── presetAgents.ts     # 预置 Agent 定义
│   │   │
│   │   ├── rag/
│   │   │   ├── documentParser.ts   # 文档解析 (pdf.js/mammoth/LLM OCR)
│   │   │   ├── textSplitter.ts     # 文本切片
│   │   │   ├── embeddingClient.ts  # Embedding API 调用
│   │   │   ├── vectorStore.ts      # 向量存储抽象层
│   │   │   ├── supabaseStore.ts    # Supabase pgvector 实现
│   │   │   ├── oramaStore.ts       # orama 本地实现(备选)
│   │   │   └── ragPipeline.ts      # RAG 完整流水线
│   │   │
│   │   ├── mcp/
│   │   │   ├── mcpClient.ts        # MCP 协议客户端
│   │   │   └── toolDiscovery.ts    # MCP Tool 自动发现
│   │   │
│   │   └── db.ts                   # Tauri SQLite 封装
│   │
│   ├── stores/                     # Zustand Stores
│   │   ├── useChatStore.ts
│   │   ├── useKBStore.ts
│   │   ├── useTaskStore.ts
│   │   ├── useAgentStore.ts
│   │   ├── useModelStore.ts
│   │   └── useSettingsStore.ts
│   │
│   ├── hooks/
│   │   ├── useStreamResponse.ts    # 流式响应 Hook
│   │   ├── useTauriCommand.ts      # Tauri invoke 封装
│   │   └── useTheme.ts
│   │
│   ├── types/
│   │   ├── index.ts                # 所有数据类型
│   │   ├── agent.ts
│   │   ├── model.ts
│   │   └── mcp.ts
│   │
│   └── assets/
│       ├── prompts/                # 预置 Prompt 模板
│       │   ├── router.md
│       │   ├── homework-tutor.md
│       │   ├── study-planner.md
│       │   └── knowledge-qa.md
│       └── icons/
│
├── bun.lockb
├── bunfig.toml
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

---

## 四、数据库 Schema (SQLite)

```sql
-- AI Provider
CREATE TABLE providers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('openai','anthropic','google','deepseek','yi','custom')),
  base_url    TEXT NOT NULL,
  api_key_ref TEXT NOT NULL,      -- Stronghold 中的引用 key，非明文
  enabled     INTEGER DEFAULT 1,
  status      TEXT DEFAULT 'untested' CHECK(status IN ('untested','connected','failed')),
  latency_ms  INTEGER,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 模型配置(全局单例)
CREATE TABLE model_config (
  id                TEXT PRIMARY KEY DEFAULT 'default',
  chat_provider_id  TEXT REFERENCES providers(id),
  chat_model_id     TEXT,
  embed_provider_id TEXT REFERENCES providers(id),
  embed_model_id    TEXT,
  temperature       REAL DEFAULT 0.3,
  max_tokens        INTEGER DEFAULT 4096
);

-- Agent
CREATE TABLE agents (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  icon           TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL CHECK(type IN ('preset','custom')),
  role           TEXT NOT NULL CHECK(role IN ('router','executor')),
  enabled        INTEGER DEFAULT 1,
  system_prompt  TEXT NOT NULL,
  prompt_version INTEGER DEFAULT 1,
  skill_ids      TEXT,             -- JSON array
  mcp_server_ids TEXT,             -- JSON array
  model_override TEXT,
  can_delete     INTEGER DEFAULT 1,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

-- Prompt 版本历史
CREATE TABLE prompt_history (
  id        TEXT PRIMARY KEY,
  agent_id  TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version   INTEGER NOT NULL,
  content   TEXT NOT NULL,
  saved_at  TEXT DEFAULT (datetime('now'))
);

-- MCP Server
CREATE TABLE mcp_servers (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  transport       TEXT NOT NULL CHECK(transport IN ('sse','stdio')),
  url             TEXT NOT NULL,
  status          TEXT DEFAULT 'disconnected',
  discovered_tools TEXT,          -- JSON array
  created_at      TEXT DEFAULT (datetime('now'))
);

-- 知识库
CREATE TABLE knowledge_bases (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  grade       INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 9),
  status      TEXT DEFAULT 'empty',
  doc_count   INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 文档
CREATE TABLE documents (
  id            TEXT PRIMARY KEY,
  kb_id         TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  file_type     TEXT NOT NULL,
  status        TEXT DEFAULT 'queued',
  progress      INTEGER DEFAULT 0,
  chunk_count   INTEGER DEFAULT 0,
  error_message TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- 对话
CREATE TABLE conversations (
  id              TEXT PRIMARY KEY,
  title           TEXT DEFAULT '新对话',
  mode            TEXT DEFAULT 'parent' CHECK(mode IN ('parent','child')),
  kb_ids          TEXT,           -- JSON array
  current_agent   TEXT,           -- 当前路由到的 Agent ID
  message_count   INTEGER DEFAULT 0,
  last_message_at TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- 消息
CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK(role IN ('user','assistant','system','routing')),
  content         TEXT NOT NULL,
  agent_id        TEXT,           -- 哪个 Agent 产生的回复
  model_id        TEXT,           -- 用了哪个模型
  attachments     TEXT,           -- JSON
  references_data TEXT,           -- JSON (RAG 引用)
  token_usage     TEXT,           -- JSON {prompt, completion}
  created_at      TEXT DEFAULT (datetime('now'))
);

-- 任务
CREATE TABLE tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  subject         TEXT,
  status          TEXT DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
  priority        TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
  due_date        TEXT,
  source          TEXT DEFAULT 'manual' CHECK(source IN ('ai','manual')),
  source_conv_id  TEXT,
  completed_at    TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- 设置 (KV)
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 索引
CREATE INDEX idx_docs_kb ON documents(kb_id);
CREATE INDEX idx_msgs_conv ON messages(conversation_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_prompt_history ON prompt_history(agent_id, version);
```

---

## 五、LLM 统一调用层

```typescript
// services/llm/llmClient.ts

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };  // base64 data URL
}

interface LLMRequest {
  messages: LLMMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
}

interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

// 统一工厂
function createLLMClient(provider: Provider): LLMClient {
  switch (provider.type) {
    case 'openai':
    case 'deepseek':
    case 'yi':
    case 'custom':
      return new OpenAICompatClient(provider);  // 共用 OpenAI 兼容协议
    case 'anthropic':
      return new AnthropicClient(provider);
    case 'google':
      return new GoogleClient(provider);
  }
}
```

**流式调用**（所有 Provider 统一为 AsyncGenerator）：

```typescript
async function* streamChat(req: LLMRequest, provider: Provider): AsyncGenerator<string> {
  const client = createLLMClient(provider);
  const response = await client.createStream(req);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // 解析 SSE data 行，提取 token
    for (const token of parseSSE(chunk, provider.type)) {
      yield token;
    }
  }
}
```

---

## 六、Agent Runtime（路由 + 执行）

```typescript
// services/agent/agentRuntime.ts

class AgentRuntime {
  
  async processMessage(
    userMessage: string,
    conversation: Conversation,
    attachments?: Attachment[]
  ): AsyncGenerator<AgentEvent> {
    
    // 1. Router Agent 判断意图
    const routeResult = await this.routerAgent.route(userMessage, conversation);
    yield { type: 'routing', agent: routeResult.targetAgent, reason: routeResult.reason };
    
    // 2. 获取目标 Agent
    const agent = await this.getAgent(routeResult.targetAgentId);
    
    // 3. 处理附件（OCR 等）
    let processedContent = userMessage;
    if (attachments?.length) {
      processedContent = await this.processAttachments(userMessage, attachments, agent);
    }
    
    // 4. RAG 检索（如果关联了知识库）
    let ragContext = '';
    if (conversation.kbIds?.length) {
      const results = await this.ragPipeline.search(processedContent, conversation.kbIds);
      ragContext = this.formatRAGContext(results);
      yield { type: 'references', data: results };
    }
    
    // 5. 构建完整 Prompt
    const messages = this.buildMessages(agent, conversation, processedContent, ragContext);
    
    // 6. 流式调用 LLM
    const provider = await this.getProvider(agent.modelOverride);
    for await (const token of streamChat({ messages, stream: true }, provider)) {
      yield { type: 'token', content: token };
    }
    
    yield { type: 'done' };
  }
}

type AgentEvent =
  | { type: 'routing'; agent: string; reason: string }
  | { type: 'references'; data: RAGResult[] }
  | { type: 'token'; content: string }
  | { type: 'tool_call'; tool: string; args: any }
  | { type: 'tool_result'; result: any }
  | { type: 'done' }
  | { type: 'error'; message: string };
```

**Router Agent Prompt 核心**:

```markdown
你是一个智能路由器。根据用户的输入，判断应该由哪个 Agent 处理。

可用 Agent:
- homework-tutor: 处理作业解答、题目解析、解题思路
- study-planner: 处理学习计划制定、任务安排、时间管理
- knowledge-qa: 处理学科知识问答、概念解释、课本内容查询

返回 JSON:
{"target": "agent-id", "reason": "一句话理由"}

规则:
1. 上传了图片/PDF 且涉及题目 → homework-tutor
2. 提到"计划""安排""每天""任务" → study-planner
3. 问"什么是""为什么""怎么理解" → knowledge-qa
4. 不确定时默认 homework-tutor
```

---

## 七、RAG Pipeline

```typescript
// services/rag/ragPipeline.ts

class RAGPipeline {

  // 文档导入全流程
  async ingest(doc: Document, onProgress: (p: number) => void): Promise<void> {
    // 1. 解析文档 → 纯文本
    onProgress(10);
    const text = await this.parser.parse(doc.filePath, doc.fileType);
    
    // 2. 切片
    onProgress(30);
    const chunks = this.splitter.split(text, { chunkSize: 512, overlap: 128 });
    
    // 3. 批量 Embedding (每批 20 条，避免 API 限流)
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);
      const batchEmbeddings = await this.embeddingClient.embed(batch);
      embeddings.push(...batchEmbeddings);
      onProgress(30 + Math.floor((i / chunks.length) * 60));
    }
    
    // 4. 写入向量库
    await this.vectorStore.upsert(
      doc.knowledgeBaseId,
      chunks.map((text, i) => ({
        id: `${doc.id}-${i}`,
        text,
        embedding: embeddings[i],
        metadata: { docId: doc.id, docName: doc.fileName, kbId: doc.knowledgeBaseId }
      }))
    );
    onProgress(100);
  }

  // 检索
  async search(query: string, kbIds: string[], topK = 5): Promise<RAGResult[]> {
    const queryEmbedding = await this.embeddingClient.embed([query]);
    return this.vectorStore.search(kbIds, queryEmbedding[0], topK);
  }
}
```

---

## 八、Tauri 配置

```json
// src-tauri/tauri.conf.json (关键部分)
{
  "productName": "小智辅导",
  "identifier": "com.xiaozhi.tutor",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "title": "小智辅导",
      "width": 1200,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600,
      "decorations": false,
      "transparent": false
    }],
    "trayIcon": {
      "iconPath": "icons/tray.png",
      "tooltip": "小智辅导"
    }
  },
  "plugins": {
    "sql": { "preload": { "db": "sqlite:xiaozhi.db" } },
    "stronghold": {},
    "notification": { "all": true },
    "fs": { "scope": ["$APPDATA/**", "$HOME/XiaoZhi/**"] },
    "http": { "scope": ["https://**"] },
    "shell": { "scope": [{ "name": "mcp-*", "cmd": "*", "args": true }] }
  }
}
```

---

## 九、开发阶段

### Phase 1 — 骨架 (5天)

```
□ bun create vite + Tauri v2 初始化
□ React Router + AppLayout + Sidebar
□ SQLite schema 初始化 + migrations
□ Stronghold 初始化
□ 6 个空页面骨架
□ 状态栏组件
```

### Phase 2 — 模型管理 + 引导 (5天)

```
□ Provider CRUD UI (卡片 + 表单)
□ API Key 加密存储 (Stronghold)
□ LLM 统一调用层 (OpenAI/Anthropic/Google/兼容协议)
□ 连接测试 + 状态展示
□ 默认模型选择器
□ Embedding 模型选择
□ 首次使用引导 (3步)
```

### Phase 3 — Agent 管理 (5天)

```
□ Agent 列表 UI (卡片)
□ Agent 详情 UI (Tab: Prompt / Skills / MCP)
□ Monaco Prompt 编辑器
□ Prompt 变量模板 + 预览
□ Prompt 版本历史
□ 预置 Agent 数据初始化
□ Skill 列表展示
□ MCP Server 添加/连接/发现
```

### Phase 4 — 知识库 (5天)

```
□ 知识库 CRUD UI
□ 文件拖拽上传
□ pdf.js / mammoth 解析
□ 多模态 LLM OCR (图片)
□ 文本切片
□ Embedding API 调用
□ Supabase pgvector 存储 / orama 备选
□ 处理进度展示
□ 向量库配置 (设置页)
```

### Phase 5 — 对话核心 (7天)

```
□ 对话列表 + 新建
□ 消息气泡 + Markdown/KaTeX 渲染
□ 文件上传到对话
□ 流式输出 (fetch stream + AsyncGenerator)
□ Router Agent 路由逻辑
□ 路由指示 UI
□ RAG 检索 + 引用展示
□ 知识库关联选择器
□ 家长/孩子模式
□ 模型临时切换
□ 一键生成任务
□ 消息复制 / 重新生成
```

### Phase 6 — 任务管理 (3天)

```
□ 三列看板 (@dnd-kit 拖拽)
□ 任务 CRUD
□ 统计概览
□ 桌面通知 (tauri notification-plugin)
□ 定时检查到期任务
```

### Phase 7 — 打磨 + 打包 (5天)

```
□ 浅色/深色主题
□ 所有空状态
□ 错误处理全局优化
□ 自定义标题栏 (macOS/Windows)
□ Tauri 打包 (exe + dmg)
□ 安装测试
□ 性能优化
```

**总计: ~5 周**

---

## 十、关键依赖

```json
// package.json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-sql": "^2",
    "@tauri-apps/plugin-stronghold": "^2",
    "@tauri-apps/plugin-notification": "^2",
    "@tauri-apps/plugin-fs": "^2",
    "@tauri-apps/plugin-http": "^2",
    "@tauri-apps/plugin-shell": "^2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^7",
    "zustand": "^5",
    "@dnd-kit/core": "^6",
    "@dnd-kit/sortable": "^8",
    "react-markdown": "^9",
    "remark-math": "^6",
    "rehype-katex": "^7",
    "remark-gfm": "^4",
    "@monaco-editor/react": "^4",
    "pdfjs-dist": "^4",
    "mammoth": "^1",
    "@orama/orama": "^3",
    "@supabase/supabase-js": "^2",
    "nanoid": "^5",
    "date-fns": "^4",
    "lucide-react": "^0.460"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "typescript": "^5.7",
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "autoprefixer": "^10"
  }
}
```
