'use client'
import { create } from 'zustand'
import type { User, Preference } from '@/lib/types'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  preferences: Preference[]
  fetched: boolean
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setPreferences: (prefs: Preference[]) => void
  setPreferenceLocal: (championRiotId: string, role: string, liked: boolean | null) => void
  getPreference: (championRiotId: string, role: string) => boolean | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  preferences: [],
  fetched: false,

  fetchMe: async () => {
    try {
      const user = await api.me()
      set({ user, fetched: true })
      if (user) {
        const prefs = await api.preferences()
        set({ preferences: prefs })
      }
    } catch {
      set({ user: null, fetched: true })
    }
  },

  logout: async () => {
    await api.logout().catch(() => {})
    set({ user: null, preferences: [], fetched: true })
  },

  setUser: (user) => set({ user }),

  setPreferences: (prefs) => set({ preferences: prefs }),

  setPreferenceLocal: (championRiotId, role, liked) =>
    set((state) => {
      const without = state.preferences.filter(
        (p) => !(p.championRiotId === championRiotId && p.role === role)
      )
      if (liked === null) return { preferences: without }
      return { preferences: [...without, { championRiotId, role, liked }] }
    }),

  getPreference: (championRiotId, role) => {
    const pref = get().preferences.find(
      (p) => p.championRiotId === championRiotId && p.role === role
    )
    return pref?.liked ?? null
  },
}))
