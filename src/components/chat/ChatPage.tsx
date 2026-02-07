import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  ArrowUp,
  Compass,
  Minus,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
  User,
  BookOpenText,
  BrainCircuit,
} from 'lucide-react'
import { useChatStore } from '../../stores/useChatStore'
import { useTaskStore } from '../../stores/useTaskStore'
import {
  loadDocumentSnapshot,
  loadConversationMemoriesSnapshot,
  loadConversationsSnapshot,
  loadCurrentConversationIdSnapshot,
  loadMessagesSnapshot,
  loadTaskSnapshot,
  saveConversationMemoriesSnapshot,
  saveConversationsSnapshot,
  saveCurrentConversationIdSnapshot,
  saveMessagesSnapshot,
  saveTaskSnapshot,
} from '../../services/persistence'
import { generateHomeworkTask } from '../../services/task/taskGenerator'
import type { Conversation, ConversationMemory, Message, Task } from '../../types'

type CommandItem = {
  value: string
  hint: string
}

const slashCommands: CommandItem[] = [
  { value: '作业辅导 Agent', hint: '分步讲解作业并生成练习' },
  { value: '学习规划 Agent', hint: '按周安排学习节奏与复盘' },
  { value: '知识问答 Agent', hint: '基于学习资料答疑解惑' },
]

const defaultKnowledgeFiles: CommandItem[] = [
  { value: '数学三上-乘法应用题.pdf', hint: '小学数学三年级上册典型题' },
  { value: '语文三上-阅读理解专项.docx', hint: '阅读理解训练与答题框架' },
  { value: '英语三上-词汇与句型练习.pdf', hint: '词汇拼写与常见句型' },
]

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `conv-${crypto.randomUUID()}`
  }

  return `conv-${Date.now()}`
}

function createMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `msg-${crypto.randomUUID()}`
  }

  return `msg-${Date.now()}`
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, '').toLowerCase()
}

function fuzzyMatch(target: string, query: string) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) {
    return true
  }

  const normalizedTarget = normalizeText(target)
  if (normalizedTarget.includes(normalizedQuery)) {
    return true
  }

  let cursor = 0
  for (const char of normalizedQuery) {
    const index = normalizedTarget.indexOf(char, cursor)
    if (index === -1) {
      return false
    }
    cursor = index + 1
  }

  return true
}

function inferSubject(content: string) {
  const mapping: Array<{ keyword: string; subject: string }> = [
    { keyword: '数学', subject: '数学' },
    { keyword: '语文', subject: '语文' },
    { keyword: '英语', subject: '英语' },
    { keyword: '物理', subject: '物理' },
    { keyword: '化学', subject: '化学' },
    { keyword: '生物', subject: '生物' },
    { keyword: '历史', subject: '历史' },
    { keyword: '地理', subject: '地理' },
    { keyword: '政治', subject: '政治' },
    { keyword: '科学', subject: '科学' },
    { keyword: '信息', subject: '信息技术' },
    { keyword: '艺术', subject: '艺术' },
  ]

  const matched = mapping.find((item) => content.includes(item.keyword))
  return matched?.subject ?? '综合'
}

function inferChildName(content: string) {
  const childPattern = /(小明|小红|小刚|孩子\d+|孩子)/
  const matched = content.match(childPattern)
  return matched?.[0] ?? '未指定孩子'
}

function inferHomeworkMode(content: string):
  | '问答题'
  | '判断题'
  | '选择题'
  | '多选题'
  | '简答题'
  | '练字题'
  | '背诵检查' {
  if (content.includes('判断')) {
    return '判断题'
  }
  if (content.includes('多选')) {
    return '多选题'
  }
  if (content.includes('选择')) {
    return '选择题'
  }
  if (content.includes('简答')) {
    return '简答题'
  }
  if (content.includes('练字')) {
    return '练字题'
  }
  if (content.includes('背诵')) {
    return '背诵检查'
  }
  return '问答题'
}

function inferUpload(content: string) {
  const filePattern = /([\w\u4e00-\u9fa5-]+\.(pdf|docx|png|jpg|jpeg))/i
  const matched = content.match(filePattern)
  return matched?.[1]
}

function toMemory(conversation: Conversation, relatedMessages: Message[]): ConversationMemory {
  const lastUserMessage = [...relatedMessages]
    .reverse()
    .find((item) => item.role === 'user' && item.content.trim().length > 0)

  return {
    conversationId: conversation.id,
    title: conversation.title,
    childName: conversation.childName,
    subject: conversation.subject,
    summary: lastUserMessage?.content.slice(0, 60) ?? '已归档会话',
    archivedAt: new Date().toISOString(),
    messageCount: relatedMessages.length,
  }
}

function matchUploadedTask(allTasks: Task[], attachment: string, childName: string, subject: string) {
  const normalizedAttachment = normalizeText(attachment)

  return allTasks.find((task) => {
    const sameChild = !task.childName || task.childName === childName
    const sameSubject = !task.subject || task.subject === subject
    const matchedTitle =
      normalizeText(task.title).includes(normalizedAttachment) ||
      normalizedAttachment.includes(normalizeText(task.title))
    const matchedQuestion =
      normalizeText(task.question ?? '').includes(normalizedAttachment) ||
      normalizedAttachment.includes(normalizeText(task.question ?? ''))
    const matchedUpload = (task.attachmentNames ?? []).some(
      (name) =>
        normalizeText(name).includes(normalizedAttachment) ||
        normalizedAttachment.includes(normalizeText(name)),
    )

    return sameChild && sameSubject && (matchedTitle || matchedQuestion || matchedUpload)
  })
}

export function ChatPage() {
  const {
    conversations,
    currentConversationId,
    messages,
    archivedMemories,
    setConversations,
    setCurrentConversationId,
    setMessages,
    setArchivedMemories,
  } = useChatStore()
  const { tasks, setTasks } = useTaskStore()

  const [initialized, setInitialized] = useState(false)
  const [sessionsCollapsed, setSessionsCollapsed] = useState(false)
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [knowledgeFiles, setKnowledgeFiles] = useState<CommandItem[]>(defaultKnowledgeFiles)
  const [highlightedCommandIndex, setHighlightedCommandIndex] = useState(0)

  const commandPanel = useMemo(() => {
    if (!input.startsWith('/') && !input.startsWith('@')) {
      return null
    }

    const mode = input.startsWith('/') ? 'slash' : 'file'
    const query = input.slice(1).trim()
    const source = mode === 'slash' ? slashCommands : knowledgeFiles
    const items = source.filter(
      (item) => fuzzyMatch(item.value, query) || fuzzyMatch(item.hint, query),
    )

    return {
      mode,
      query,
      items,
    }
  }, [input, knowledgeFiles])

  const safeHighlightedCommandIndex = useMemo(() => {
    if (!commandPanel || commandPanel.items.length === 0) {
      return 0
    }

    return Math.min(highlightedCommandIndex, Math.max(0, commandPanel.items.length - 1))
  }, [commandPanel, highlightedCommandIndex])

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const [storedConversations, storedMessages, storedCurrentId, storedMemories, storedTasks, storedDocuments] =
        await Promise.all([
          loadConversationsSnapshot(),
          loadMessagesSnapshot(),
          loadCurrentConversationIdSnapshot(),
          loadConversationMemoriesSnapshot(),
          loadTaskSnapshot(),
          loadDocumentSnapshot(),
        ])

      if (!active) {
        return
      }

      setConversations(storedConversations)
      setMessages(storedMessages)
      setArchivedMemories(storedMemories)
      setTasks(storedTasks)

      const fileItems = storedDocuments.map((item) => ({
        value: item.fileName,
        hint: `${item.fileType.toUpperCase()} · ${Math.round(item.fileSize / 1024)} KB`,
      }))
      setKnowledgeFiles(fileItems.length > 0 ? fileItems : defaultKnowledgeFiles)

      if (storedCurrentId && storedConversations.some((item) => item.id === storedCurrentId)) {
        setCurrentConversationId(storedCurrentId)
      } else if (storedConversations.length > 0) {
        setCurrentConversationId(storedConversations[0].id)
      }

      setInitialized(true)
    }

    void initialize()

    return () => {
      active = false
    }
  }, [setArchivedMemories, setConversations, setCurrentConversationId, setMessages, setTasks])

  useEffect(() => {
    if (!initialized) {
      return
    }
    void saveConversationsSnapshot(conversations)
  }, [conversations, initialized])

  useEffect(() => {
    if (!initialized) {
      return
    }
    void saveMessagesSnapshot(messages)
  }, [initialized, messages])

  useEffect(() => {
    if (!initialized) {
      return
    }
    void saveCurrentConversationIdSnapshot(currentConversationId)
  }, [currentConversationId, initialized])

  useEffect(() => {
    if (!initialized) {
      return
    }
    void saveConversationMemoriesSnapshot(archivedMemories)
  }, [archivedMemories, initialized])

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === currentConversationId) ?? null,
    [conversations, currentConversationId],
  )

  const activeMessages = useMemo(() => {
    if (!activeConversation) {
      return []
    }

    return messages.filter((item) => item.conversationId === activeConversation.id)
  }, [activeConversation, messages])

  const relatedTasks = useMemo(() => {
    if (!activeConversation) {
      return tasks.slice(0, 4)
    }

    return tasks
      .filter(
        (task) =>
          task.sourceConvId === activeConversation.id ||
          (task.childName === activeConversation.childName && task.subject === activeConversation.subject),
      )
      .slice(0, 4)
  }, [activeConversation, tasks])

  const createConversation = (content?: string) => {
    const now = new Date().toISOString()
    const inferredSubject = content ? inferSubject(content) : '综合'
    const inferredChildName = content ? inferChildName(content) : '未指定孩子'

    const conversation: Conversation = {
      id: createSessionId(),
      title: `${inferredChildName} · ${inferredSubject}辅导`,
      mode: 'parent',
      kbIds: [],
      currentAgent: '作业辅导 Agent',
      childName: inferredChildName,
      subject: inferredSubject,
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
    }

    setConversations([conversation, ...conversations])
    setCurrentConversationId(conversation.id)
    return conversation
  }

  const ensureConversation = (content: string) => {
    if (activeConversation) {
      return activeConversation
    }

    return createConversation(content)
  }

  const handleSend = () => {
    const content = input.trim()
    if (!content) {
      return
    }

    const conversation = ensureConversation(content)
    const now = new Date().toISOString()
    const inferredSubject = inferSubject(content)
    const inferredChildName = inferChildName(content)
    const inferredUpload = inferUpload(content)
    const activeAgent = selectedAgent ?? '作业辅导 Agent'
    const activeKnowledge = selectedFile ?? `${inferredSubject}资料`

    const userMessage: Message = {
      id: createMessageId(),
      conversationId: conversation.id,
      role: 'user',
      content,
      childName: inferredChildName,
      subject: inferredSubject,
      agentName: activeAgent,
      kbName: activeKnowledge,
      createdAt: now,
      attachments: inferredUpload
        ? [
            {
              id: `attachment-${Date.now()}`,
              name: inferredUpload,
              type: 'other',
              size: 0,
            },
          ]
        : undefined,
    }

    const assistantMessage: Message = {
      id: createMessageId(),
      conversationId: conversation.id,
      role: 'assistant',
      content: `明白了，我会按“${inferredChildName} / ${inferredSubject}”这个上下文继续辅导，并自动同步家庭作业。`,
      childName: inferredChildName,
      subject: inferredSubject,
      agentName: activeAgent,
      kbName: activeKnowledge,
      createdAt: new Date().toISOString(),
    }

    const nextConversations = conversations.map((item) =>
      item.id === conversation.id
        ? {
            ...item,
            title: `${inferredChildName} · ${inferredSubject}辅导`,
            childName: inferredChildName,
            subject: inferredSubject,
            currentAgent: activeAgent,
            messageCount: messages.filter((message) => message.conversationId === conversation.id).length + 2,
            lastMessageAt: now,
          }
        : item,
    )

    setConversations(nextConversations)

    const matchedTask = inferredUpload
      ? matchUploadedTask(tasks, inferredUpload, inferredChildName, inferredSubject)
      : undefined

    let nextTasks = tasks
    let nextAssistantContent = assistantMessage.content

    if (matchedTask) {
      const completedTask: Task = {
        ...matchedTask,
        status: 'done',
        completedAt: now,
        updatedAt: now,
        originUploadName: inferredUpload,
        attachmentNames: Array.from(
          new Set(
            [...(matchedTask.attachmentNames ?? []), inferredUpload].filter(
              (item): item is string => typeof item === 'string' && item.length > 0,
            ),
          ),
        ),
      }
      nextTasks = tasks.map((task) => (task.id === matchedTask.id ? completedTask : task))
      nextAssistantContent = `我已匹配到作业《${matchedTask.title}》，并根据你上传的“${inferredUpload}”标记完成。`
    } else {
      const homeworkTask = generateHomeworkTask({
        title: `${inferredSubject}辅导作业 · ${inferredChildName}`,
        childName: inferredChildName,
        subject: inferredSubject,
        description: content,
        mode: inferHomeworkMode(content),
        source: 'ai',
        sourceConvId: conversation.id,
      })

      nextTasks = [
        {
          ...homeworkTask,
          attachmentNames: inferredUpload ? [inferredUpload] : [],
        },
        ...tasks,
      ]
    }

    const finalAssistantMessage = {
      ...assistantMessage,
      content: nextAssistantContent,
    }

    setMessages([...messages, userMessage, finalAssistantMessage])
    setTasks(nextTasks)
    void saveTaskSnapshot(nextTasks)

    setInput('')
  }

  const handleSelectCommand = (item: CommandItem) => {
    if (input.startsWith('/')) {
      setSelectedAgent(item.value)
      setInput('')
      return
    }

    if (input.startsWith('@')) {
      setSelectedFile(item.value)
      setInput('')
      return
    }

    setInput(item.value)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return
    }

    if (commandPanel) {
      const { items } = commandPanel

      if (event.key === 'ArrowDown' && items.length > 0) {
        event.preventDefault()
        setHighlightedCommandIndex((prev) => (prev + 1) % items.length)
        return
      }

      if (event.key === 'ArrowUp' && items.length > 0) {
        event.preventDefault()
        setHighlightedCommandIndex((prev) => (prev - 1 + items.length) % items.length)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()

        if (items.length > 0) {
          const target = items[safeHighlightedCommandIndex] ?? items[0]
          if (target) {
            handleSelectCommand(target)
          }
        }

        return
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleSend()
    }
  }

  const removeConversation = (conversationId: string) => {
    const target = conversations.find((item) => item.id === conversationId)
    if (!target) {
      return
    }

    const relatedMessages = messages.filter((item) => item.conversationId === conversationId)
    const memory = toMemory(target, relatedMessages)
    setArchivedMemories([memory, ...archivedMemories])

    const nextConversations = conversations.filter((item) => item.id !== conversationId)
    setConversations(nextConversations)
    setMessages(messages.filter((item) => item.conversationId !== conversationId))

    if (currentConversationId === conversationId) {
      setCurrentConversationId(nextConversations[0]?.id)
    }
  }

  const showEmptyState = conversations.length === 0 || !activeConversation

  return (
    <section className="page page--chat">
      <header className="home-header chat-page-header">
        <div>
          <h1 className="page__title page__title--with-icon">
            💬 对话
          </h1>
          <p className="page__desc">
            直接自然语言说需求即可：孩子是谁、哪门学科、要做什么作业，我会自动理解并同步家庭作业。
          </p>
        </div>
        <button className="home-btn home-btn--primary" type="button" onClick={() => createConversation()}>
          <Plus size={16} />
          新建对话
        </button>
      </header>

      <div className={`home-grid home-grid--full ${sessionsCollapsed ? 'home-grid--collapsed' : ''}`}>
        <aside className="home-card home-sessions">
          {!sessionsCollapsed && (
            <div className="home-card__title home-card__title--row">
              <span>历史对话</span>
              <span className="session-count">{conversations.length}</span>
            </div>
          )}

          {!sessionsCollapsed && (
            <div className="session-list" role="list">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversation?.id

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`session-item${isActive ? ' session-item--active' : ''}`}
                    onClick={() => setCurrentConversationId(conversation.id)}
                  >
                    <div className="session-item__icon">
                      <Sparkles size={16} />
                    </div>
                    <div className="session-item__body">
                      <strong>{conversation.title}</strong>
                      <span>
                        {conversation.childName ?? '未指定孩子'} · {conversation.subject ?? '综合'}
                      </span>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      className="session-delete"
                      aria-label="删除对话"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeConversation(conversation.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          removeConversation(conversation.id)
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="sessions-spacer" />

          <button
            className={`ghost-btn sessions-toggle-btn${sessionsCollapsed ? ' sessions-toggle-btn--compact' : ''}`}
            type="button"
            onClick={() => setSessionsCollapsed((value) => !value)}
            aria-label={sessionsCollapsed ? '展开历史' : '折叠历史'}
            title={sessionsCollapsed ? '展开历史' : '折叠历史'}
          >
            {sessionsCollapsed ? <Plus size={14} /> : <><Minus size={14} /> 折叠</>}
          </button>
        </aside>

        <section className="home-card home-chat">
          <div className="chat-toolbar chat-toolbar--with-bindings">
            <div className="chat-badges">
              <span className="badge">
                <User size={12} /> 家长模式
              </span>
              <span className="badge">
                <BookOpenText size={12} /> 学习资料已接入
              </span>
              <span className="badge">
                <BrainCircuit size={12} /> 模型自动路由
              </span>
            </div>
            <span className="routing-hint">
              <Compass size={14} /> 无需前置选择，直接说需求
            </span>
          </div>

          {relatedTasks.length > 0 && (
            <div className="chat-linked-tasks" aria-label="关联家庭作业">
              <span className="chat-linked-tasks__label">关联家庭作业</span>
              {relatedTasks.map((task) => (
                <span key={task.id} className="chat-linked-task-chip">
                  {task.title}
                </span>
              ))}
            </div>
          )}

          <div className="chat-stream">
            {showEmptyState ? (
              <div className="chat-empty">
                <Sparkles size={20} />
                <strong>直接输入一句话开始对话</strong>
                <p>例如：给小明布置一套数学多选题，并生成可打印作业；我会自动识别并创建任务。</p>
              </div>
            ) : (
              activeMessages.map((message) => (
                <div
                  key={message.id}
                  className={`bubble ${message.role === 'assistant' ? 'bubble--assistant' : 'bubble--user'}`}
                >
                  <p>{message.content}</p>
                  {message.role === 'assistant' && (
                    <div className="bubble-tip">
                      <span className="name-chip name-chip--agent">{message.agentName ?? '作业辅导 Agent'}</span>
                      <span className="name-chip name-chip--kb">{message.kbName ?? '学习资料'}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {(selectedAgent || selectedFile) && (
            <div className="chat-floating-tags" aria-label="当前对话上下文">
              {selectedAgent && (
                <span className="name-chip name-chip--agent">
                  {selectedAgent}
                  <button
                    className="name-chip__close"
                    type="button"
                    onClick={() => setSelectedAgent(null)}
                    aria-label="移除 Agent"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedFile && (
                <span className="name-chip name-chip--kb">
                  {selectedFile}
                  <button
                    className="name-chip__close"
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    aria-label="移除文件"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}

          <div className="chat-input-wrap">
            <div className="chat-input-box">
              {commandPanel && (
                <div className="command-panel" role="listbox" aria-label="指令联想">
                  <span className="command-panel__title">
                    <Search size={12} />
                    {commandPanel.mode === 'slash' ? 'Agent 指令' : '学习资料文件'}
                    {commandPanel.query ? (
                      <span className="command-panel__query">{commandPanel.query}</span>
                    ) : null}
                  </span>

                  {commandPanel.items.length > 0 ? (
                    commandPanel.items.map((item, index) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`command-item${index === safeHighlightedCommandIndex ? ' command-item--active' : ''}`}
                        role="option"
                        aria-selected={index === safeHighlightedCommandIndex}
                        onClick={() => handleSelectCommand(item)}
                      >
                        <span className="command-item__key command-item__key--glow">{item.value}</span>
                        <span className="command-item__label">{item.hint}</span>
                      </button>
                    ))
                  ) : (
                    <div className="command-empty">未找到匹配项，继续输入可模糊搜索</div>
                  )}
                </div>
              )}

              <input
                className="chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="直接输入需求，或用 / 选 Agent、@ 选学习资料文件"
              />
            </div>

            <button className="home-btn home-btn--primary" type="button" aria-label="发送" onClick={handleSend}>
              <Send size={16} />
              <ArrowUp size={14} />
            </button>
          </div>

          {archivedMemories.length > 0 && (
            <div className="chat-memory-strip">
              <span className="chat-memory-strip__title">已归档记忆</span>
              {archivedMemories.slice(0, 3).map((memory) => (
                <span key={memory.conversationId} className="chat-memory-chip">
                  {memory.childName ?? '未命名'} · {memory.subject ?? '综合'} · {memory.summary}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
