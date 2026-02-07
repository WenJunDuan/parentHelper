import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Download, ListTodo, X } from 'lucide-react'
import { useTaskStore } from '../../stores/useTaskStore'
import { loadTaskSnapshot, saveTaskSnapshot } from '../../services/persistence'
import type { Task } from '../../types'

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

function taskTypeLabel(taskType?: Task['taskType']) {
  if (!taskType || taskType === 'qa') {
    return '问答题'
  }
  if (taskType === 'true-false') {
    return '判断题'
  }
  if (taskType === 'single-choice') {
    return '选择题'
  }
  if (taskType === 'multi-choice') {
    return '多选题'
  }
  if (taskType === 'short-answer') {
    return '简答题'
  }
  if (taskType === 'handwriting') {
    return '练字题'
  }
  if (taskType === 'recitation') {
    return '背诵检查'
  }
  return '问答题'
}

function dueLabel(task: Task) {
  if (!task.dueDate) {
    return '未设置截止时间'
  }

  const due = new Date(task.dueDate)
  const now = new Date()
  const dayDiff = Math.floor((due.getTime() - now.getTime()) / (24 * 3600 * 1000))

  if (dayDiff < 0) {
    return `截止：${Math.abs(dayDiff)} 天前`
  }
  if (dayDiff === 0) {
    return '截止：今天'
  }
  if (dayDiff === 1) {
    return '截止：明天'
  }

  return `截止：${due.toLocaleDateString('zh-CN')}`
}

function statusColorClass(task: Task) {
  if (task.status === 'done') {
    return 'task-board-card--done'
  }

  if (task.status === 'in_progress') {
    return 'task-board-card--progress'
  }

  const due = task.dueDate ? new Date(task.dueDate).getTime() : 0
  if (due > 0 && due < Date.now()) {
    return 'task-board-card--overdue'
  }

  return 'task-board-card--todo'
}

function sourceLabel(source: Task['source']) {
  return source === 'ai' ? '🤖 AI生成' : '✍️ 手动'
}

export function TaskPage() {
  const { tasks, setTasks } = useTaskStore()
  const [initialized, setInitialized] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)

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

  const taskColumns = useMemo(() => {
    const todo = tasks.filter((item) => item.status === 'todo')
    const inProgress = tasks.filter((item) => item.status === 'in_progress')
    const done = tasks.filter((item) => item.status === 'done')

    return { todo, inProgress, done }
  }, [tasks])

  useEffect(() => {
    if (!detailTask) {
      return
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetailTask(null)
      }
    }

    window.addEventListener('keydown', onKeydown)
    return () => {
      window.removeEventListener('keydown', onKeydown)
    }
  }, [detailTask])

  return (
    <section className="page task-page-design">
      <header className="home-header">
        <div>
          <h1 className="page__title page__title--with-icon">
            <ListTodo size={20} /> 家庭作业
          </h1>
          <p className="page__desc">作业由 Bot 对话自动生成，这里只做查看、状态追踪与导出。</p>
        </div>
        <span className="badge">
          <CalendarClock size={14} /> 今日待办 {taskColumns.todo.length}
        </span>
      </header>

      <div className="task-board">
        <article className="task-board-column">
          <header className="task-board-column__head">
            <span>📋 待办</span>
            <span className="session-count">{taskColumns.todo.length}</span>
          </header>

          <div className="task-board-list">
            {taskColumns.todo.map((task) => (
              <button
                key={task.id}
                className={`task-board-card ${statusColorClass(task)}`}
                type="button"
                onClick={() => setDetailTask(task)}
              >
                <strong>{task.title}</strong>
                <div className="task-board-card__meta">
                  <span className="model-kind-pill">{task.subject || '综合'}</span>
                  <span className="model-kind-pill">{taskTypeLabel(task.taskType)}</span>
                </div>
                <p>{task.question || task.description || '暂无内容'}</p>
                <div className="task-board-card__foot">
                  <span>{dueLabel(task)}</span>
                  <span className="task-board-source">{sourceLabel(task.source)}</span>
                </div>
              </button>
            ))}

            {taskColumns.todo.length === 0 && <div className="model-empty">暂无待办作业</div>}
          </div>
        </article>

        <article className="task-board-column">
          <header className="task-board-column__head">
            <span>🔄 进行中</span>
            <span className="session-count">{taskColumns.inProgress.length}</span>
          </header>

          <div className="task-board-list">
            {taskColumns.inProgress.map((task) => (
              <button
                key={task.id}
                className={`task-board-card ${statusColorClass(task)}`}
                type="button"
                onClick={() => setDetailTask(task)}
              >
                <strong>{task.title}</strong>
                <div className="task-board-card__meta">
                  <span className="model-kind-pill">{task.subject || '综合'}</span>
                  <span className="model-kind-pill">{taskTypeLabel(task.taskType)}</span>
                </div>
                <p>{task.question || task.description || '暂无内容'}</p>
                <div className="task-board-card__foot">
                  <span>{dueLabel(task)}</span>
                  <span className="task-board-source">{sourceLabel(task.source)}</span>
                </div>
              </button>
            ))}

            {taskColumns.inProgress.length === 0 && <div className="model-empty">暂无进行中作业</div>}
          </div>
        </article>

        <article className="task-board-column">
          <header className="task-board-column__head">
            <span>✅ 已完成</span>
            <span className="session-count">{taskColumns.done.length}</span>
          </header>

          <div className="task-board-list">
            {taskColumns.done.map((task) => (
              <button
                key={task.id}
                className={`task-board-card ${statusColorClass(task)}`}
                type="button"
                onClick={() => setDetailTask(task)}
              >
                <strong>{task.title}</strong>
                <div className="task-board-card__meta">
                  <span className="model-kind-pill">{task.subject || '综合'}</span>
                  <span className="model-kind-pill">{taskTypeLabel(task.taskType)}</span>
                </div>
                <p>{task.question || task.description || '暂无内容'}</p>
                <div className="task-board-card__foot">
                  <span>{task.completedAt ? `完成：${new Date(task.completedAt).toLocaleDateString('zh-CN')}` : '已完成'}</span>
                </div>
              </button>
            ))}

            {taskColumns.done.length === 0 && <div className="model-empty">暂无已完成作业</div>}
          </div>
        </article>
      </div>

      {detailTask && (
        <div
          className="task-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="作业详情"
          onClick={() => setDetailTask(null)}
        >
          <article className="task-modal" onClick={(event) => event.stopPropagation()}>
            <header className="task-modal__head">
              <div>
                <h3>{detailTask.title}</h3>
                <p>
                  {detailTask.childName || '未绑定孩子'} · {detailTask.subject || '综合'} ·{' '}
                  {taskTypeLabel(detailTask.taskType)}
                </p>
              </div>

              <button className="model-icon-btn" type="button" onClick={() => setDetailTask(null)}>
                <X size={14} />
              </button>
            </header>

            <section className="task-modal__body">
              <p>{detailTask.question || detailTask.description || '暂无题目内容'}</p>

              {detailTask.options && detailTask.options.length > 0 && (
                <div className="task-online-options">
                  {detailTask.options.map((item) => (
                    <span key={item} className="chat-linked-task-chip">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {detailTask.recitationChecklist && detailTask.recitationChecklist.length > 0 && (
                <div className="task-online-options">
                  {detailTask.recitationChecklist.map((item) => (
                    <span key={item} className="chat-linked-task-chip">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <footer className="task-modal__foot">
              <button className="home-btn" type="button" onClick={() => setDetailTask(null)}>
                关闭
              </button>
              <button className="home-btn home-btn--primary" type="button" onClick={() => downloadAsPdf(detailTask)}>
                <Download size={16} /> 导出作业
              </button>
            </footer>
          </article>
        </div>
      )}
    </section>
  )
}
