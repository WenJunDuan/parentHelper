import { create } from 'zustand'
import type { Task } from '../types'

type TaskState = {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  reset: () => void
}

const initialState = {
  tasks: [],
}

export const useTaskStore = create<TaskState>((set) => ({
  ...initialState,
  setTasks: (tasks) => set({ tasks }),
  reset: () => set(initialState),
}))
