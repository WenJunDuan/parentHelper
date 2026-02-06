import { create } from 'zustand'
import type { Document, KnowledgeBase } from '../types'

type KBState = {
  knowledgeBases: KnowledgeBase[]
  documents: Document[]
  setKnowledgeBases: (knowledgeBases: KnowledgeBase[]) => void
  setDocuments: (documents: Document[]) => void
  reset: () => void
}

const initialState = {
  knowledgeBases: [],
  documents: [],
}

export const useKBStore = create<KBState>((set) => ({
  ...initialState,
  setKnowledgeBases: (knowledgeBases) => set({ knowledgeBases }),
  setDocuments: (documents) => set({ documents }),
  reset: () => set(initialState),
}))
