import { describe, expect, it } from 'vitest'
import { useAgentStore } from './useAgentStore'
import { useChatStore } from './useChatStore'
import { useKBStore } from './useKBStore'
import { useModelStore } from './useModelStore'
import { useSettingsStore } from './useSettingsStore'
import { useTaskStore } from './useTaskStore'

describe('store smoke', () => {
  it('initializes all stores', () => {
    expect(useChatStore.getState().conversations).toEqual([])
    expect(useKBStore.getState().knowledgeBases).toEqual([])
    expect(useTaskStore.getState().tasks).toEqual([])
    expect(useAgentStore.getState().agents).toEqual([])
    expect(useModelStore.getState().providers).toEqual([])
    expect(useSettingsStore.getState().theme).toBe('system')
  })
})
