import { create } from 'zustand'
import type { Conversation, ConversationMemory, Message } from '../types'

type ChatState = {
  conversations: Conversation[]
  currentConversationId?: string
  messages: Message[]
  archivedMemories: ConversationMemory[]
  setConversations: (conversations: Conversation[]) => void
  setCurrentConversationId: (conversationId?: string) => void
  setMessages: (messages: Message[]) => void
  setArchivedMemories: (memories: ConversationMemory[]) => void
  reset: () => void
}

const initialState = {
  conversations: [],
  currentConversationId: undefined,
  messages: [],
  archivedMemories: [],
}

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversationId: (conversationId) => set({ currentConversationId: conversationId }),
  setMessages: (messages) => set({ messages }),
  setArchivedMemories: (archivedMemories) => set({ archivedMemories }),
  reset: () => set(initialState),
}))
