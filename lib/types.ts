export interface User {
  id: number
  username: string
  isAdmin: boolean
}

export interface Region {
  id: number
  slug: string
  name: string
  description?: string | null
  imageUrl?: string | null
}

export interface RegionSlim {
  id: number
  slug: string
  name: string
}

export interface ChampionRole {
  role: string
}

export interface Champion {
  id: number
  riotId: string
  name: string
  title?: string | null
  imageUrl?: string | null
  splashUrl?: string | null
  roles: ChampionRole[]
  regions: RegionSlim[]
}

export interface RegionDetail extends Region {
  champions: Champion[]
}

export interface Preference {
  championRiotId: string
  role: string
  liked: boolean
}

export interface GamePlayer {
  id: number
  userId?: number | null
  playerName: string
  championRiotId: string
  championName: string
  championImageUrl?: string | null
  role: string
}

export interface Game {
  id: number
  regionId?: number | null
  regionName?: string | null
  won: boolean
  playedAt: string
  notes?: string | null
  players: GamePlayer[]
}

export interface ChampionAssignment {
  championName: string
  championRiotId: string
  role: string
  imageUrl?: string | null
  assignedPlayer?: string | null
}

export interface Composition {
  score: number
  label: string
  assignments: ChampionAssignment[]
}

export interface TeamCompositionResponse {
  region: string
  compositions: Composition[]
}
