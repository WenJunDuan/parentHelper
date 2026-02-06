CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('openai','anthropic','google','deepseek','yi','custom')),
  base_url TEXT NOT NULL,
  api_key_ref TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  status TEXT DEFAULT 'untested' CHECK(status IN ('untested','connected','failed')),
  latency_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS model_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  chat_provider_id TEXT REFERENCES providers(id),
  chat_model_id TEXT,
  embed_provider_id TEXT REFERENCES providers(id),
  embed_model_id TEXT,
  temperature REAL DEFAULT 0.3,
  max_tokens INTEGER DEFAULT 4096
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('preset','custom')),
  role TEXT NOT NULL CHECK(role IN ('router','executor')),
  enabled INTEGER DEFAULT 1,
  system_prompt TEXT NOT NULL,
  prompt_version INTEGER DEFAULT 1,
  skill_ids TEXT,
  mcp_server_ids TEXT,
  model_override TEXT,
  can_delete INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prompt_history (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  saved_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  transport TEXT NOT NULL CHECK(transport IN ('sse','stdio')),
  url TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  discovered_tools TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 9),
  status TEXT DEFAULT 'empty',
  doc_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  kb_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '新对话',
  mode TEXT DEFAULT 'parent' CHECK(mode IN ('parent','child')),
  kb_ids TEXT,
  current_agent TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system','routing')),
  content TEXT NOT NULL,
  agent_id TEXT,
  model_id TEXT,
  attachments TEXT,
  references_data TEXT,
  token_usage TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  status TEXT DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
  due_date TEXT,
  source TEXT DEFAULT 'manual' CHECK(source IN ('ai','manual')),
  source_conv_id TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_kb ON documents(kb_id);
CREATE INDEX IF NOT EXISTS idx_msgs_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_prompt_history ON prompt_history(agent_id, version);

