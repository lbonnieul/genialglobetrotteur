import type { ChampionAssignment, Composition } from '@/lib/types'

const ROLES = ['top', 'jungle', 'mid', 'bot', 'support'] as const
const LABELS = ['Composition A', 'Composition B', 'Composition C', 'Composition D', 'Composition E', 'Composition F']
const SCORE_LIKE = 3
const SCORE_NEUTRAL = 1
const SCORE_DISLIKE = -999

interface Player {
  name: string
  preferences: Map<string, boolean> // key: `${riotId}:${role}`
}

interface ChampionData {
  riotId: string
  name: string
  imageUrl?: string | null
  roles: string[]
}

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return }
  for (let i = 0; i <= arr.length - k; i++)
    for (const rest of combinations(arr.slice(i + 1), k - 1))
      yield [arr[i], ...rest]
}

function* permutations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return }
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest, k - 1))
      yield [arr[i], ...p]
  }
}

function slotScore(player: Player, riotId: string, role: string): number {
  const pref = player.preferences.get(`${riotId}:${role}`)
  if (pref === true) return SCORE_LIKE
  if (pref === false) return SCORE_DISLIKE
  return SCORE_NEUTRAL
}

function assignPlayers(players: Player[], slots: [string, string][]): Map<number, string> {
  const n = players.length
  const s = slots.length
  if (n === 0 || s === 0) return new Map()

  const k = Math.min(n, s)
  const matrix = players.map(p => slots.map(([riotId, role]) => slotScore(p, riotId, role)))

  let best = new Map<number, string>()
  let bestScore = -Infinity

  const slotIndices = Array.from({ length: s }, (_, i) => i)
  const playerIndices = Array.from({ length: n }, (_, i) => i)

  for (const slotCombo of combinations(slotIndices, k)) {
    for (const playerPerm of permutations(playerIndices, k)) {
      let total = 0
      let valid = true
      for (let i = 0; i < k; i++) {
        const score = matrix[playerPerm[i]][slotCombo[i]]
        if (score === SCORE_DISLIKE) { valid = false; break }
        total += score
      }
      if (valid && total > bestScore) {
        bestScore = total
        best = new Map(slotCombo.map((si, i) => [si, players[playerPerm[i]].name]))
      }
    }
  }
  return best
}

function getForced(players: Player[], byRole: Map<string, ChampionData[]>): Array<{ player: Player; champion: ChampionData; role: string }> {
  const allSlots: [ChampionData, string][] = []
  for (const [role, champs] of byRole)
    for (const c of champs)
      allSlots.push([c, role])

  const forced = []
  for (const player of players) {
    const valid = allSlots.filter(([c, role]) => player.preferences.get(`${c.riotId}:${role}`) !== false)
    if (valid.length === 1) {
      const [champion, role] = valid[0]
      forced.push({ player, champion, role })
    }
  }
  return forced
}

function buildOne(
  players: Player[],
  byRole: Map<string, ChampionData[]>,
  forced: Array<{ player: Player; champion: ChampionData; role: string }>
): Composition | null {
  const usedChamps = new Set<string>()
  const usedRoles = new Set<string>()
  const raw: [string, ChampionData][] = [] // [role, champ]

  for (const fa of forced) {
    if (usedRoles.has(fa.role) || usedChamps.has(fa.champion.riotId)) continue
    raw.push([fa.role, fa.champion])
    usedChamps.add(fa.champion.riotId)
    usedRoles.add(fa.role)
  }

  const remaining = ROLES.filter(r => !usedRoles.has(r)).sort(() => Math.random() - 0.5)
  for (const role of remaining) {
    const candidates = (byRole.get(role) ?? []).filter(c => !usedChamps.has(c.riotId))
    if (!candidates.length) continue
    const champ = candidates[Math.floor(Math.random() * candidates.length)]
    usedChamps.add(champ.riotId)
    raw.push([role, champ])
  }

  if (!raw.length) return null

  const slots: [string, string][] = raw.map(([role, c]) => [c.riotId, role])

  // Pre-assign forced players
  const preAssigned = new Map<number, string>()
  const assignedPlayers = new Set<string>()
  for (const fa of forced) {
    if (assignedPlayers.has(fa.player.name)) continue
    const idx = slots.findIndex(([riotId, role]) => riotId === fa.champion.riotId && role === fa.role)
    if (idx !== -1 && !preAssigned.has(idx)) {
      preAssigned.set(idx, fa.player.name)
      assignedPlayers.add(fa.player.name)
    }
  }

  // Optimize remaining players
  const remainingPlayers = players.filter(p => !assignedPlayers.has(p.name))
  const remainingSlotIndices = slots.map((_, i) => i).filter(i => !preAssigned.has(i))
  if (remainingPlayers.length && remainingSlotIndices.length) {
    const subSlots = remainingSlotIndices.map(i => slots[i]) as [string, string][]
    const sub = assignPlayers(remainingPlayers, subSlots)
    for (const [localIdx, name] of sub)
      preAssigned.set(remainingSlotIndices[localIdx], name)
  }

  const roleIndex = Object.fromEntries(ROLES.map((r, i) => [r, i]))
  const assignments: ChampionAssignment[] = raw
    .map(([role, champ], i) => ({
      championName: champ.name,
      championRiotId: champ.riotId,
      role,
      imageUrl: champ.imageUrl,
      assignedPlayer: preAssigned.get(i) ?? null,
    }))
    .sort((a, b) => (roleIndex[a.role] ?? 99) - (roleIndex[b.role] ?? 99))

  const covered = new Set(assignments.map(a => a.role))
  return { score: covered.size / 5, label: '', assignments }
}

export function buildCompositions(
  rawPlayers: { name: string; preferences: Record<string, boolean> }[],
  champions: ChampionData[],
  numSuggestions = 3
): Composition[] {
  const players: Player[] = rawPlayers.map(p => ({
    name: p.name,
    preferences: new Map(Object.entries(p.preferences)),
  }))

  const byRole = new Map<string, ChampionData[]>()
  for (const role of ROLES) byRole.set(role, [])
  for (const c of champions)
    for (const role of c.roles)
      if (byRole.has(role)) byRole.get(role)!.push(c)

  const forced = getForced(players, byRole)
  const compositions: Composition[] = []
  const seen = new Set<string>()
  let attempts = 0

  while (compositions.length < numSuggestions && attempts < 400) {
    attempts++
    const comp = buildOne(players, byRole, forced)
    if (!comp) continue
    const key = [...comp.assignments.map(a => a.championRiotId)].sort().join(',')
    if (!seen.has(key)) {
      seen.add(key)
      comp.label = LABELS[compositions.length]
      compositions.push(comp)
    }
  }
  return compositions
}
