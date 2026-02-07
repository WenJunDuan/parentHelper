import { create } from 'zustand'
import type { Task } from '../types'

type TaskState = {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (taskId: string) => void
  reset: () => void
}

const initialState = {
  tasks: [],
}

export const useTaskStore = create<TaskState>((set) => ({
  ...initialState,
  setTasks: (tasks) => set({ tasks }),
  upsertTask: (task) =>
    set((state) => {
      const exists = state.tasks.some((item) => item.id === task.id)

      if (!exists) {
        return {
          tasks: [task, ...state.tasks],
        }
      }

      return {
        tasks: state.tasks.map((item) => (item.id === task.id ? task : item)),
      }
    }),
  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((item) => item.id !== taskId),
    })),
  reset: () => set(initialState),
}))
