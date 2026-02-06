import { create } from 'zustand'
import type { ModelConfig, Provider } from '../types'

type ModelState = {
  providers: Provider[]
  modelConfig?: ModelConfig
  setProviders: (providers: Provider[]) => void
  setModelConfig: (modelConfig?: ModelConfig) => void
  reset: () => void
}

const initialState = {
  providers: [],
  modelConfig: undefined,
}

export const useModelStore = create<ModelState>((set) => ({
  ...initialState,
  setProviders: (providers) => set({ providers }),
  setModelConfig: (modelConfig) => set({ modelConfig }),
  reset: () => set(initialState),
}))
