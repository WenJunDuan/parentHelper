import { create } from 'zustand'
import type { ChildProfile, VectorDBSettings } from '../types'

type SettingsState = {
  childProfiles: ChildProfile[]
  activeChildId?: string
  vectorDB?: VectorDBSettings
  theme: 'light' | 'dark' | 'system'
  setChildProfiles: (profiles: ChildProfile[]) => void
  upsertChildProfile: (profile: ChildProfile) => void
  removeChildProfile: (childId: string) => void
  setActiveChildId: (childId?: string) => void
  setVectorDB: (vectorDB?: VectorDBSettings) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  reset: () => void
}

const initialState: Omit<
  SettingsState,
  | 'setChildProfiles'
  | 'upsertChildProfile'
  | 'removeChildProfile'
  | 'setActiveChildId'
  | 'setVectorDB'
  | 'setTheme'
  | 'reset'
> = {
  childProfiles: [],
  activeChildId: undefined,
  vectorDB: undefined,
  theme: 'system',
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initialState,
  setChildProfiles: (childProfiles) =>
    set((state) => {
      const fallbackId = childProfiles[0]?.id
      const activeChildId = childProfiles.some((item) => item.id === state.activeChildId)
        ? state.activeChildId
        : fallbackId

      return {
        childProfiles,
        activeChildId,
      }
    }),
  upsertChildProfile: (profile) =>
    set((state) => {
      const exists = state.childProfiles.some((item) => item.id === profile.id)

      if (!exists) {
        return {
          childProfiles: [...state.childProfiles, profile],
          activeChildId: profile.id,
        }
      }

      return {
        childProfiles: state.childProfiles.map((item) => (item.id === profile.id ? profile : item)),
      }
    }),
  removeChildProfile: (childId) =>
    set((state) => {
      const childProfiles = state.childProfiles.filter((item) => item.id !== childId)
      const activeChildId =
        state.activeChildId === childId ? childProfiles[0]?.id : state.activeChildId

      return {
        childProfiles,
        activeChildId,
      }
    }),
  setActiveChildId: (activeChildId) => set({ activeChildId }),
  setVectorDB: (vectorDB) => set({ vectorDB }),
  setTheme: (theme) => set({ theme }),
  reset: () => set(initialState),
}))
