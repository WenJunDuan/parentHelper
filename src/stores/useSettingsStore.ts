import { create } from 'zustand'
import type { ChildProfile, VectorDBSettings } from '../types'

type SettingsState = {
  childProfile?: ChildProfile
  vectorDB?: VectorDBSettings
  theme: 'light' | 'dark' | 'system'
  setChildProfile: (profile?: ChildProfile) => void
  setVectorDB: (vectorDB?: VectorDBSettings) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  reset: () => void
}

const initialState: Omit<SettingsState, 'setChildProfile' | 'setVectorDB' | 'setTheme' | 'reset'> =
  {
    childProfile: undefined,
    vectorDB: undefined,
    theme: 'system',
  }

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initialState,
  setChildProfile: (childProfile) => set({ childProfile }),
  setVectorDB: (vectorDB) => set({ vectorDB }),
  setTheme: (theme) => set({ theme }),
  reset: () => set(initialState),
}))
