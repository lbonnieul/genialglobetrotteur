import type { User, Region, RegionDetail, Champion, Preference, Game, Composition } from '@/lib/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

const jsonBody = (body: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const post = (body: unknown) => ({ method: 'POST' as const, ...jsonBody(body) })
const patch = (body: unknown) => ({ method: 'PATCH' as const, ...jsonBody(body) })
const put = (body: unknown) => ({ method: 'PUT' as const, ...jsonBody(body) })

export const api = {
  // Auth
  register: (username: string, password: string) =>
    request<User>('/api/auth/register', post({ username, password })),
  login: (username: string, password: string) =>
    request<User>('/api/auth/login', post({ username, password })),
  me: () => request<User | null>('/api/auth/me'),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  updateUsername: (username: string) =>
    request<User>('/api/auth/update', patch({ username })),
  updatePassword: (password: string) =>
    request<User>('/api/auth/update', patch({ password })),

  // Regions
  regions: () => request<Region[]>('/api/regions'),
  region: (slug: string) => request<RegionDetail>(`/api/regions/${slug}`),

  // Champions
  champions: () => request<Champion[]>('/api/champions'),
  champion: (riotId: string) => request<Champion>(`/api/champions/${riotId}`),
  updateChampion: (riotId: string, data: { roles?: string[]; regionIds?: number[] }) =>
    request<Champion>(`/api/champions/${riotId}`, patch(data)),

  // Preferences
  preferences: () => request<Preference[]>('/api/preferences'),
  setPreference: (championRiotId: string, role: string, liked: boolean | null) =>
    request<Preference | null>('/api/preferences', put({ championRiotId, role, liked })),

  // Games
  games: () => request<Game[]>('/api/games'),
  deleteGame: (id: number) => request<void>(`/api/games/${id}`, { method: 'DELETE' }),

  createGame: (data: {
    regionId: number
    won: boolean
    notes?: string
    players: { userId?: number | null; playerName: string; championRiotId: string; championName: string; championImageUrl?: string; role: string }[]
  }) => request<Game>('/api/games', post(data)),

  // Team compositions
  compositions: (data: {
    regionSlug: string
    players: { name: string; preferences: Record<string, boolean> }[]
    numSuggestions?: number
  }) => request<{ compositions: Composition[] }>('/api/team/compositions', post(data)),

  // Admin
  seed: (secret: string) =>
    request<{ message: string }>('/api/admin/seed', post({ secret })),
}
