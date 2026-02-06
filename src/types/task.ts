export interface Task {
  id: string
  title: string
  description?: string
  subject?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  dueDate?: string
  source: 'ai' | 'manual'
  sourceConvId?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
