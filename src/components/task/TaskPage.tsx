import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Download,
  Eye,
  FileQuestion,
  ListTodo,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useTaskStore } from '../../stores/useTaskStore'
import { loadTaskSnapshot, saveTaskSnapshot } from '../../services/persistence'
import { generateHomeworkTask } from '../../services/task/taskGenerator'
import type { Task } from '../../types'

type TaskDraft = {
  title: string
  childName: string
  subject: string
  description: string
  mode: '问答题' | '判断题' | '选择题' | '多选题' | '简答题' | '练字题' | '背诵检查'
}

const defaultDraft: TaskDraft = {
  title: '',
  childName: '',
  subject: '数学',
  description: '',
  mode: '问答题',
}

function createTaskId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `task-${crypto.randomUUID()}`
  }

  return `task-${Date.now()}`
}

function downloadAsPdf(task: Task) {
  const content = [
    '家庭作业打印版',
    `标题：${task.title}`,
    `孩子：${task.childName ?? '未绑定'}`,
    `学科：${task.subject ?? '综合'}`,
    `题型：${task.taskType ?? 'qa'}`,
    `题目：${task.question ?? task.description ?? ''}`,
    `说明：${task.description ?? ''}`,
  ].join('\n')

  const blob = new Blob([content], { type: 'application/pdf;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${task.title || 'homework'}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}

function onlineStatusText(task: Task) {
  if (task.status === 'done') {
    return '已完成'
  }

  if (task.status === 'in_progress') {
    return '作答中'
  }

  return '待开始'
}

export function TaskPage() {
  const { tasks, setTasks, upsertTask, removeTask } = useTaskStore()
  const [initialized, setInitialized] = useState(false)
  const [draft, setDraft] = useState<TaskDraft>(defaultDraft)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [onlineAnswer, setOnlineAnswer] = useState('')

  const activeTask = useMemo(
    () => tasks.find((item) => item.id === activeTaskId) ?? null,
    [activeTaskId, tasks],
  )

  const activeTaskTypeLabel = useMemo(() => {
    if (!activeTask?.taskType) {
      return '问答题'
    }

    if (activeTask.taskType === 'true-false') {
      return '判断题'
    }

    if (activeTask.taskType === 'single-choice') {
      return '选择题'
    }

    if (activeTask.taskType === 'multi-choice') {
      return '多选题'
    }

    if (activeTask.taskType === 'short-answer') {
      return '简答题'
    }

    if (activeTask.taskType === 'handwriting') {
      return '练字题'
    }

    if (activeTask.taskType === 'recitation') {
      return '背诵检查'
    }

    return '问答题'
  }, [activeTask])

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const stored = await loadTaskSnapshot()
      if (!active) {
        return
      }

      setTasks(stored)
      setInitialized(true)
    }

    void initialize()

    return () => {
      active = false
    }
  }, [setTasks])

  useEffect(() => {
    if (!initialized) {
      return
    }

    void saveTaskSnapshot(tasks)
  }, [initialized, tasks])

  const grouped = useMemo(() => {
    const todo = tasks.filter((item) => item.status === 'todo')
    const inProgress = tasks.filter((item) => item.status === 'in_progress')
    const done = tasks.filter((item) => item.status === 'done')

    return {
      todo,
      inProgress,
      done,
    }
  }, [tasks])

  const handleSave = () => {
    const title = draft.title.trim()
    if (!title) {
      return
    }

    const nextTask = generateHomeworkTask({
      title,
      childName: draft.childName.trim() || undefined,
      subject: draft.subject,
      description: draft.description.trim(),
      mode: draft.mode,
      source: 'manual',
    })

    upsertTask(nextTask)
    setDraft(defaultDraft)
  }

  const handleStartOnline = (task: Task) => {
    const nextStatus = task.status === 'done' ? 'done' : 'in_progress'
    upsertTask({
      ...task,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    })
    setActiveTaskId(task.id)
    setOnlineAnswer(task.answerText ?? '')
  }

  const handleSubmitOnline = () => {
    if (!activeTask) {
      return
    }

    upsertTask({
      ...activeTask,
      answerText: onlineAnswer,
      status: 'done',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  const handleCreateQuickQuestion = () => {
    const now = new Date().toISOString()
    const task: Task = {
      id: createTaskId(),
      title: `${draft.subject}快速练习`,
      subject: draft.subject,
      childName: draft.childName.trim() || undefined,
      taskType: 'qa',
      question: `请完成${draft.subject}今日快速问答并写出解题过程。`,
      status: 'todo',
      priority: 'medium',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    }

    upsertTask(task)
  }

  return (
    <section className="page">
      <h1 className="page__title page__title--with-icon">
        <ListTodo size={20} />
        家庭作业
      </h1>
      <p className="page__desc">支持在线做题、PDF 导出与多题型生成，并与对话区自动同步状态。</p>

      <div className="task-layout">
        <article className="feature-card task-editor-card">
          <div className="feature-card__title">
            <Plus size={16} /> 生成家庭作业
          </div>

          <label className="field">
            <span className="field__label">作业标题</span>
            <input
              className="field__input"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="例如：数学口算训练"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field__label">孩子姓名</span>
              <input
                className="field__input"
                value={draft.childName}
                onChange={(event) => setDraft((prev) => ({ ...prev, childName: event.target.value }))}
                placeholder="可选"
              />
            </label>

            <label className="field">
              <span className="field__label">学科</span>
              <input
                className="field__input"
                value={draft.subject}
                onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field__label">作业模式</span>
              <select
                className="field__input"
                value={draft.mode}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, mode: event.target.value as TaskDraft['mode'] }))
                }
              >
                <option value="问答题">问答题</option>
                <option value="判断题">判断题</option>
                <option value="选择题">选择题</option>
                <option value="多选题">多选题</option>
                <option value="简答题">简答题</option>
                <option value="练字题">练字题</option>
                <option value="背诵检查">背诵检查</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">快捷题目</span>
              <button className="home-btn" type="button" onClick={handleCreateQuickQuestion}>
                <FileQuestion size={16} /> 一键生成
              </button>
            </label>
          </div>

          <label className="field">
            <span className="field__label">说明</span>
            <textarea
              className="field__input child-textarea"
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="作业要求与完成标准"
            />
          </label>

          <div className="model-editor-actions model-editor-actions--compact">
            <button className="home-btn home-btn--primary" type="button" onClick={handleSave}>
              <Save size={16} /> 保存作业
            </button>
          </div>
        </article>

        <article className="feature-card task-list-card">
          <div className="feature-card__title">
            <CalendarClock size={16} /> 作业列表（待完成 {grouped.todo.length} / 作答中 {grouped.inProgress.length}）
          </div>

          <div className="task-list">
            {tasks.map((task) => (
              <div key={task.id} className={`task-row${task.status === 'done' ? ' task-row--done' : ''}`}>
                <button className="task-toggle" type="button" onClick={() => handleStartOnline(task)}>
                  {onlineStatusText(task)}
                </button>
                <div className="task-row__main">
                  <strong>{task.title}</strong>
                  <span>
                    {(task.childName || '未绑定孩子')} · {task.subject || '综合'} ·
                    {task.source === 'ai' ? ' 来自对话' : ' 手动布置'} ·
                    {task.taskType || 'qa'}
                  </span>
                  <p>{task.question || task.description || '暂无题目描述'}</p>
                </div>
                <div className="task-row__actions">
                  <button className="model-icon-btn" type="button" onClick={() => handleStartOnline(task)}>
                    <Eye size={14} />
                  </button>
                  <button className="model-icon-btn" type="button" onClick={() => downloadAsPdf(task)}>
                    <Download size={14} />
                  </button>
                  <button
                    className="model-icon-btn model-icon-btn--danger"
                    type="button"
                    onClick={() => removeTask(task.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {tasks.length === 0 && <div className="model-empty">暂无家庭作业，可手动生成或从对话自动创建。</div>}
          </div>

          {activeTask && (
            <div className="task-online-panel">
              <div className="task-online-panel__title">
                在线作答：{activeTask.title}
                <span className="task-online-panel__type">{activeTaskTypeLabel}</span>
              </div>

              <p className="task-online-panel__question">{activeTask.question || activeTask.description}</p>

              {activeTask.options && activeTask.options.length > 0 && (
                <div className="task-online-options">
                  {activeTask.options.map((option) => (
                    <span key={option} className="chat-linked-task-chip">
                      {option}
                    </span>
                  ))}
                </div>
              )}

              {activeTask.recitationChecklist && activeTask.recitationChecklist.length > 0 && (
                <div className="task-online-options">
                  {activeTask.recitationChecklist.map((item) => (
                    <span key={item} className="chat-linked-task-chip">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              <textarea
                className="field__input child-textarea"
                value={onlineAnswer}
                onChange={(event) => setOnlineAnswer(event.target.value)}
                placeholder="在线填写答案、简答、背诵记录或练字说明"
              />

              <div className="model-editor-actions model-editor-actions--compact">
                <button className="home-btn home-btn--primary" type="button" onClick={handleSubmitOnline}>
                  <Save size={16} /> 提交并标记完成
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
