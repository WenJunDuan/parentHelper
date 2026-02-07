import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUp,
  Compass,
  Minus,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useChatStore } from '../../stores/useChatStore'
import { useTaskStore } from '../../stores/useTaskStore'
import {
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

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const [storedConversations, storedMessages, storedCurrentId, storedMemories, storedTasks] =
        await Promise.all([
          loadConversationsSnapshot(),
          loadMessagesSnapshot(),
          loadCurrentConversationIdSnapshot(),
          loadConversationMemoriesSnapshot(),
          loadTaskSnapshot(),
        ])

      if (!active) {
        return
      }

      setConversations(storedConversations)
      setMessages(storedMessages)
      setArchivedMemories(storedMemories)
      setTasks(storedTasks)

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

    const userMessage: Message = {
      id: createMessageId(),
      conversationId: conversation.id,
      role: 'user',
      content,
      childName: inferredChildName,
      subject: inferredSubject,
      agentName: '作业辅导 Agent',
      kbName: `${inferredSubject}资料`,
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
      agentName: '作业辅导 Agent',
      kbName: `${inferredSubject}资料`,
      createdAt: new Date().toISOString(),
    }

    const nextConversations = conversations.map((item) =>
      item.id === conversation.id
        ? {
            ...item,
            title: `${inferredChildName} · ${inferredSubject}辅导`,
            childName: inferredChildName,
            subject: inferredSubject,
            currentAgent: '作业辅导 Agent',
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
        attachmentNames: Array.from(new Set([...(matchedTask.attachmentNames ?? []), inferredUpload])),
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
      <header className="home-header">
        <div>
          <h1 className="page__title">对话</h1>
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
              <span className="badge">家长模式</span>
              <span className="badge">自然语言引导</span>
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

          <div className="chat-input-wrap">
            <div className="chat-input-box">
              <input
                className="chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="直接输入：给小明布置数学选择题；上传math-homework.pdf并标记完成"
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

