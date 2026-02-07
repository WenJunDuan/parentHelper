export interface Task {
  id: string
  title: string
  description?: string
  subject?: string
  childId?: string
  childName?: string
  taskType?:
    | 'qa'
    | 'true-false'
    | 'single-choice'
    | 'multi-choice'
    | 'short-answer'
    | 'handwriting'
    | 'recitation'
  question?: string
  options?: string[]
  answerText?: string
  selectedOptions?: string[]
  recitationChecklist?: string[]
  attachmentNames?: string[]
  printTemplate?: string
  originUploadName?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  dueDate?: string
  source: 'ai' | 'manual'
  sourceConvId?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
