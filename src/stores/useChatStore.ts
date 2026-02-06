import { create } from 'zustand'
import type { Conversation, Message } from '../types'

type ChatState = {
  conversations: Conversation[]
  currentConversationId?: string
  messages: Message[]
  setConversations: (conversations: Conversation[]) => void
  setCurrentConversationId: (conversationId?: string) => void
  setMessages: (messages: Message[]) => void
  reset: () => void
}

const initialState = {
  conversations: [],
  currentConversationId: undefined,
  messages: [],
}

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversationId: (conversationId) => set({ currentConversationId: conversationId }),
  setMessages: (messages) => set({ messages }),
  reset: () => set(initialState),
}))
