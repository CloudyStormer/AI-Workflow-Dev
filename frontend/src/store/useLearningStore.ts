import { create } from 'zustand'
import {
  initialChatThreads,
  learningWords,
  tutorReplies,
  type ChatContactId,
  type ChatMessage,
} from '../data/content'

type SettingKey =
  | 'dailyReminder'
  | 'weeklyReport'
  | 'soundFeedback'
  | 'darkMode'
  | 'motivation'
  | 'quietMode'
  | 'autoPlay'
  | 'showTranslations'

type LearningState = {
  wordIndex: number
  learnedToday: number
  sessionCompleted: number
  masteredWordIds: string[]
  knownWords: number
  streakDays: number
  chatThreads: Record<ChatContactId, ChatMessage[]>
  isRecording: boolean
  settings: Record<SettingKey, boolean>
  nextWord: (known: boolean) => void
  sendMessage: (contactId: ChatContactId, text: string) => void
  clearChat: (contactId: ChatContactId) => void
  restartChat: (contactId: ChatContactId) => void
  toggleRecording: () => void
  toggleSetting: (key: SettingKey) => void
}

export const useLearningStore = create<LearningState>((set) => ({
  wordIndex: 0,
  learnedToday: 32,
  sessionCompleted: 12,
  masteredWordIds: [],
  knownWords: 1248,
  streakDays: 7,
  chatThreads: initialChatThreads,
  isRecording: false,
  settings: {
    dailyReminder: true,
    weeklyReport: true,
    soundFeedback: true,
    darkMode: false,
    motivation: true,
    quietMode: false,
    autoPlay: true,
    showTranslations: true,
  },
  nextWord: (known) =>
    set((state) => {
      const currentWordId = learningWords[state.wordIndex].word
      const isNewMastery = known && !state.masteredWordIds.includes(currentWordId)

      return {
        wordIndex: (state.wordIndex + 1) % learningWords.length,
        learnedToday: state.learnedToday + 1,
        sessionCompleted: Math.min(50, state.sessionCompleted + 1),
        masteredWordIds: isNewMastery
          ? [...state.masteredWordIds, currentWordId]
          : state.masteredWordIds,
        knownWords: isNewMastery ? state.knownWords + 1 : state.knownWords,
      }
    }),
  sendMessage: (contactId, text) => {
    const trimmed = text.trim()
    if (!trimmed) return

    set((state) => {
      const currentThread = state.chatThreads[contactId]
      const nextId = Math.max(...currentThread.map((message) => message.id), 0) + 1
      const reply = tutorReplies[(nextId + currentThread.length) % tutorReplies.length]

      return {
        chatThreads: {
          ...state.chatThreads,
          [contactId]: [
            ...currentThread,
            { id: nextId, sender: 'learner', text: trimmed },
            { id: nextId + 1, sender: 'tutor', text: reply },
          ],
        },
      }
    })
  },
  clearChat: (contactId) =>
    set((state) => ({
      chatThreads: {
        ...state.chatThreads,
        [contactId]: [],
      },
    })),
  restartChat: (contactId) =>
    set((state) => ({
      chatThreads: {
        ...state.chatThreads,
        [contactId]: [...initialChatThreads[contactId]],
      },
    })),
  toggleRecording: () => set((state) => ({ isRecording: !state.isRecording })),
  toggleSetting: (key) =>
    set((state) => ({
      settings: {
        ...state.settings,
        [key]: !state.settings[key],
      },
    })),
}))
