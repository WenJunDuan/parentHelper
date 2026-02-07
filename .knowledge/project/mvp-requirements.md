# 小智辅导 — MVP 需求规格书 v2

> **产品定位**：面向普通家长的 AI 作业辅导桌面应用
> **用户画像**：会使用电脑的普通办公人群（非技术人员）
> **平台**：Windows (.exe/.msi) + macOS (.dmg)
> **技术栈**：Tauri v2 + React 18 + TypeScript + Bun
> **设计风格**：清爽、简洁、美观、略带可爱
> **核心约束**：纯本地客户端，零服务端，AI 模型全部调用在线 API

---

## 一、架构原则

```
1. 零服务端：没有任何自建后端，所有持久化在本地 SQLite，所有 AI 能力调外部 API
2. 零 Python：纯 TypeScript/Rust 技术栈，文档解析用 JS 库，向量存储用外部向量库
3. 模型可换：支持多家 LLM 厂商（OpenAI/Anthropic/Google/DeepSeek 等），用户自选
4. Agent 可见：Agent 不是黑盒，用户可查看和编辑 Prompt/Skills/MCP 配置
5. 路由调度：预置 Router Agent 自动判断用户意图，派发到专业 Agent 执行
```

---

## 二、MVP 功能范围

### ✅ MVP 包含

| 模块 | 功能 | 优先级 |
|------|------|--------|
| **AI 模型管理** | 多厂商 Provider 配置（API Key / Base URL / 模型选择） | P0 |
| **AI 模型管理** | 连接测试 + 模型列表拉取 | P0 |
| **AI 模型管理** | 默认模型指定（对话用 / Embedding 用） | P0 |
| **Agent 管理** | Agent 列表展示（预置 + 自定义） | P0 |
| **Agent 管理** | Agent 详情：System Prompt 编辑 | P0 |
| **Agent 管理** | Agent 详情：Skills（工具能力）绑定展示 | P1 |
| **Agent 管理** | Agent 详情：MCP Server 连接管理 | P1 |
| **Agent 管理** | Router Agent（预置，自动意图路由） | P0 |
| **知识库** | 上传课本 PDF/图片/DOCX，自动解析 + 切片 | P0 |
| **知识库** | 调用外部 Embedding API 向量化 | P0 |
| **知识库** | 存入外部向量库（Supabase pgvector） | P0 |
| **知识库** | 按学科/年级组织，处理进度展示 | P0 |
| **Bot 对话** | 预置"作业辅导"Bot，支持多轮对话 | P0 |
| **Bot 对话** | Router Agent 自动路由到合适的 Agent | P0 |
| **Bot 对话** | 上传作业图片/PDF，自动 OCR 解析 | P0 |
| **Bot 对话** | RAG 检索 + 流式输出 + Markdown 渲染 | P0 |
| **Bot 对话** | 家长模式 / 孩子模式切换 | P1 |
| **Bot 对话** | 一键生成学习任务 | P1 |
| **任务管理** | Todo 看板（待办/进行/完成）+ 拖拽 | P0 |
| **任务管理** | 桌面通知提醒 | P1 |
| **设置** | 孩子信息 / 主题 / 数据管理 | P0 |

### ❌ MVP 不包含

| 功能 | 原因 |
|------|------|
| 服务端 / 多设备同步 | 纯本地，无自建后端 |
| 本地模型（Ollama） | MVP 全用在线 API |
| 外部 Todo 同步（飞书/钉钉） | 后期 MCP 扩展 |
| 成绩分析 / 辅导计划生成 | 二期功能 |
| 多孩 Profile | MVP 单用户 |

---

## 三、模块需求详述

### 3.1 AI 模型管理

**用户故事**：
- 我想配置多个 AI 服务商，随时切换
- 我想测试连接是否正常，看到延迟
- 我想分别指定「对话模型」和「Embedding 模型」

**功能需求**：

```
F-MODEL-001: Provider 管理
  - 支持厂商: OpenAI / Anthropic / Google Gemini / DeepSeek / 零一万物 / 自定义(OpenAI兼容)
  - 每个 Provider 配置项: 显示名称 / 厂商类型 / Base URL / API Key / 启用状态
  - 支持添加多个同厂商 Provider（如多个 OpenAI Key）
  - API Key 加密存储（Tauri secure store）
  - 每个 Provider 可拉取可用模型列表

F-MODEL-002: 模型选择
  - 对话模型: 从已配置 Provider 中选择一个模型作为默认
  - Embedding 模型: 单独选择（可选同 Provider 或不同 Provider）
  - 模型卡片展示: 名称 / 厂商图标 / 上下文窗口大小
  - 对话界面顶部可临时切换模型（不影响全局默认）

F-MODEL-003: 连接测试
  - 每个 Provider 有「测试连接」按钮
  - 测试结果: 成功(延迟ms) / 失败(错误原因)
  - 状态灯: 🟢 可用 / 🔴 不可用 / 🟡 测试中
```

**数据模型**：

```typescript
interface Provider {
  id: string;
  name: string;           // "我的 Claude"
  type: ProviderType;     // openai | anthropic | google | deepseek | yi | custom
  baseUrl: string;        // "https://api.anthropic.com"
  apiKey: string;         // 加密存储
  enabled: boolean;
  status: 'untested' | 'connected' | 'failed';
  latencyMs?: number;
  createdAt: string;
}

interface ModelConfig {
  chatProviderId: string;
  chatModelId: string;       // "claude-sonnet-4-20250514"
  embedProviderId: string;
  embedModelId: string;      // "text-embedding-3-small"
  temperature: number;       // 0-1, 默认 0.3
  maxTokens: number;         // 默认 4096
}

enum ProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  DEEPSEEK = 'deepseek',
  YI = 'yi',
  CUSTOM = 'custom'
}
```

### 3.2 Agent 管理

**用户故事**：
- 我想查看每个 Agent 的 Prompt 和工具能力
- Router Agent 帮我自动选 Agent，不用手动切
- 高级用户可以编辑 Agent Prompt 调试效果

**功能需求**：

```
F-AGENT-001: Agent 列表
  - 卡片式展示所有 Agent
  - 每张卡片: 图标 / 名称 / 描述 / 启用开关 / 类型标签(预置/自定义)
  - 预置 Agent 不可删除，可编辑 Prompt
  - 自定义 Agent 可创建/编辑/删除

F-AGENT-002: Agent 详情 - Prompt 配置
  - System Prompt 代码编辑器（等宽字体 + 语法高亮）
  - 支持模板变量: {{child_name}}, {{grade}}, {{mode}}, {{current_date}}
  - Prompt 版本历史（每次保存自动记录）
  - 「恢复默认」按钮（预置 Agent）
  - 侧边预览: 变量替换后的实际 Prompt

F-AGENT-003: Agent 详情 - Skills 管理
  - Skills = Agent 可调用的工具能力
  - 列表展示: 技能名称 / 描述 / 类型(内置/MCP) / 启用开关
  - 内置 Skills: rag_search, ocr_parse, calculator, task_create, web_search
  - MCP Skills: 从已连接 MCP Server 自动发现并展示

F-AGENT-004: Agent 详情 - MCP Server 管理
  - MCP Server 列表: 名称 / URL / 连接状态 / 提供的工具数
  - 添加: 输入 name + transport type(SSE/stdio) + URL
  - 自动发现 MCP Server 暴露的 Tools
  - 连接/断开/删除操作

F-AGENT-005: Router Agent（核心预置，不可删除/禁用）
  - 接收用户输入 → 分析意图 → 返回目标 Agent ID
  - 路由使用轻量模型（Haiku / GPT-4o-mini）降低成本和延迟
  - 对话中透明展示路由决策: "🧭 → 作业辅导"
  - 路由 Prompt 可编辑（高级用户调优）
```

**预置 Agent**：

| ID | 名称 | 图标 | 角色 | 绑定 Skills |
|----|------|------|------|-------------|
| `router` | 路由调度 | 🧭 | router | — |
| `homework-tutor` | 作业辅导 | 📝 | executor | ocr_parse, rag_search, calculator |
| `study-planner` | 学习规划 | 📅 | executor | task_create, rag_search |
| `knowledge-qa` | 知识问答 | 💡 | executor | rag_search, web_search |

**数据模型**：

```typescript
interface Agent {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'preset' | 'custom';
  role: 'router' | 'executor';
  enabled: boolean;
  systemPrompt: string;
  promptVersion: number;
  promptHistory: PromptVersion[];
  skillIds: string[];
  mcpServerIds: string[];
  modelOverride?: string;   // 可覆盖全局默认模型
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PromptVersion {
  version: number;
  content: string;
  savedAt: string;
}

interface Skill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'builtin' | 'mcp';
  mcpServerId?: string;
  inputSchema?: object;      // JSON Schema
  enabled: boolean;
}

interface McpServer {
  id: string;
  name: string;
  transport: 'sse' | 'stdio';
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  discoveredTools: McpTool[];
  createdAt: string;
}
```

### 3.3 知识库模块

```
F-KB-001: 文档上传
  - 支持: PDF, PNG, JPG, JPEG, DOCX
  - 拖拽上传 + 点击选择，支持批量
  - 单文件限制: 50MB

F-KB-002: 知识库组织
  - 创建: 名称 + 学科(语文/数学/英语/科学/其他) + 年级(1-9)
  - 卡片列表展示
  - 删除知识库/单个文档（需确认）

F-KB-003: 文档处理流水线（纯 TS 实现）
  - PDF → pdf.js 提取文本
  - 图片 → 调多模态 LLM API (发送 base64 图片) 做 OCR
  - DOCX → mammoth.js 提取文本
  - 文本 → 切片 (512 token, 128 overlap)
  - 切片 → 调外部 Embedding API 生成向量
  - 向量 → 存入 Supabase pgvector (或本地 orama 备选)

F-KB-004: 处理进度
  - 每个文档独立进度条
  - 状态: 排队中 / 解析中 / 向量化中 / 已就绪 / 失败(可重试)
```

**数据模型**：

```typescript
interface KnowledgeBase {
  id: string;
  name: string;
  subject: 'chinese' | 'math' | 'english' | 'science' | 'other';
  grade: number;          // 1-9
  documentCount: number;
  status: 'empty' | 'processing' | 'ready' | 'partial';
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'image' | 'docx';
  status: 'queued' | 'parsing' | 'embedding' | 'ready' | 'failed';
  progress: number;       // 0-100
  chunkCount?: number;
  errorMessage?: string;
  createdAt: string;
}
```

### 3.4 Bot 对话模块

```
F-CHAT-001: 对话管理
  - 新建 / 历史列表 / 搜索 / 删除

F-CHAT-002: 消息交互
  - 文本输入 (Enter发送, Shift+Enter换行)
  - 文件上传 (拖拽/点击, 图片/PDF)
  - 流式输出 (SSE/fetch stream)
  - Markdown 渲染 (标题/列表/代码/表格/KaTeX公式)
  - 消息: 复制 / 重新生成

F-CHAT-003: 知识库关联
  - 对话顶部选择关联知识库(多选)
  - 自动 RAG 检索，回答标注引用来源

F-CHAT-004: 模式切换
  - 👨‍👩‍👧 家长模式(完整答案) / 🧒 孩子模式(引导提示)

F-CHAT-005: 一键生成任务
  - AI 回复含学习建议时，显示 "📌 添加为任务"

F-CHAT-006: Router Agent 路由
  - 用户消息先经 Router Agent → 返回目标 Agent
  - 界面显示路由指示: "🧭 → 作业辅导"
  - 同一对话内可自动切换 Agent

F-CHAT-007: 模型临时切换
  - 对话顶部显示当前模型，点击可临时切换
```

### 3.5 任务管理模块

```
F-TASK-001: 三列看板 (📋待办 / 🔄进行中 / ✅已完成) + 拖拽
F-TASK-002: 任务 CRUD (标题/描述/学科/截止日期/优先级)
F-TASK-003: 桌面通知提醒 (到期前30分钟)
F-TASK-004: 统计概览 (今日待办/本周完成/逾期/进度条)
```

### 3.6 设置模块

```
F-SET-001: 孩子信息 (姓名/年级/薄弱学科)
F-SET-002: 向量库配置 (Supabase 连接 或 本地 orama)
F-SET-003: 外观 (浅色/深色/跟随系统)
F-SET-004: 提醒开关
F-SET-005: 数据管理 (存储路径/清除数据)
F-SET-006: 关于 (版本/检查更新)
```

---

## 四、全局布局与交互

### 4.1 导航结构

左侧导航分两组（中间用分隔线隔开）：
- **日常使用**：💬 对话 / 📚 知识库 / ✅ 任务
- **系统管理**：🤖 Agent / 🧠 模型 / ⚙️ 设置

### 4.2 首次引导（3步）

```
Step 1: 欢迎 + 配置 Provider (选厂商 → 填Key → 测试连接)
Step 2: 孩子信息 (姓名/年级)
Step 3: 完成 (可选上传课本 或 直接对话)
```

### 4.3 状态栏

```
🟢 Claude Sonnet · 知识库 3个就绪 · 3 Agents 活跃 · 今日待办 5个
```

---

## 五、非功能需求

| 维度 | 要求 |
|------|------|
| 启动时间 | < 3 秒 (Tauri 优势) |
| 内存占用 | 空闲 < 80MB，工作 < 300MB |
| 安装包 | < 30MB |
| 数据 | 本地 SQLite + 外部向量库 |
| 离线 | 知识库管理 + 任务管理可离线，对话需网络 |
| 系统 | Windows 10+ / macOS 12+, 4GB RAM |
