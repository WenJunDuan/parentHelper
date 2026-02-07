import type { Task } from '../../types'

type HomeworkMode =
  | '问答题'
  | '判断题'
  | '选择题'
  | '多选题'
  | '简答题'
  | '练字题'
  | '背诵检查'

type GenerateTaskOptions = {
  title: string
  childId?: string
  childName?: string
  subject?: string
  description?: string
  mode: HomeworkMode
  source: 'ai' | 'manual'
  sourceConvId?: string
}

function createTaskId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `task-${crypto.randomUUID()}`
  }

  return `task-${Date.now()}`
}

function normalizeType(mode: HomeworkMode): Task['taskType'] {
  if (mode === '判断题') {
    return 'true-false'
  }

  if (mode === '选择题') {
    return 'single-choice'
  }

  if (mode === '多选题') {
    return 'multi-choice'
  }

  if (mode === '简答题') {
    return 'short-answer'
  }

  if (mode === '练字题') {
    return 'handwriting'
  }

  if (mode === '背诵检查') {
    return 'recitation'
  }

  return 'qa'
}

function buildTemplate(type: Task['taskType'], subject: string) {
  if (type === 'true-false') {
    return {
      question: `${subject}知识判断：请判断以下说法是否正确。`,
      options: ['正确', '错误'],
      answerText: '',
    }
  }

  if (type === 'single-choice') {
    return {
      question: `${subject}单选题：请选择正确答案。`,
      options: ['A', 'B', 'C', 'D'],
      answerText: '',
    }
  }

  if (type === 'multi-choice') {
    return {
      question: `${subject}多选题：请选择所有正确选项。`,
      options: ['A', 'B', 'C', 'D'],
      answerText: '',
    }
  }

  if (type === 'short-answer') {
    return {
      question: `${subject}简答题：请分点作答。`,
      options: [],
      answerText: '',
    }
  }

  if (type === 'handwriting') {
    return {
      question: `请完成${subject}练字，注意笔画规范与结构布局。`,
      options: [],
      answerText: '',
    }
  }

  if (type === 'recitation') {
    return {
      question: `${subject}背诵检查：请完整背诵并录音。`,
      options: [],
      answerText: '',
      recitationChecklist: ['流畅度', '准确度', '停顿与节奏'],
    }
  }

  return {
    question: `${subject}问答题：请先独立作答，再查看讲解。`,
    options: [],
    answerText: '',
  }
}

export function generateHomeworkTask(options: GenerateTaskOptions): Task {
  const now = new Date().toISOString()
  const subject = options.subject ?? '综合'
  const type = normalizeType(options.mode)
  const template = buildTemplate(type, subject)

  return {
    id: createTaskId(),
    title: options.title,
    description: options.description,
    subject,
    childId: options.childId,
    childName: options.childName,
    taskType: type,
    question: template.question,
    options: template.options,
    answerText: template.answerText,
    recitationChecklist: template.recitationChecklist,
    printTemplate: `【${options.mode}】${options.title}`,
    status: 'todo',
    priority: 'medium',
    source: options.source,
    sourceConvId: options.sourceConvId,
    createdAt: now,
    updatedAt: now,
  }
}

