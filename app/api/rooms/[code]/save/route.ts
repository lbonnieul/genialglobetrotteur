import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rooms, roomMembers, roomVotes, games, gamePlayers } from '@/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import type { Composition } from '@/lib/types'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { code } = await params
  const { won, playedAt } = await req.json()

  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1)
  if (!room) return NextResponse.json({ error: 'Room introuvable' }, { status: 404 })
  if (room.createdBy !== session.id && !session.isAdmin)
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const comps = room.compositions as Composition[] | null
  if (!comps?.length) return NextResponse.json({ error: 'Aucune composition générée' }, { status: 400 })

  // Find winning composition by votes
  const votes = await db.select().from(roomVotes).where(eq(roomVotes.roomId, room.id))
  const tally = new Map<number, number>()
  for (const v of votes) tally.set(v.compositionIndex, (tally.get(v.compositionIndex) ?? 0) + 1)

  let winnerIdx = 0
  let maxVotes = -1
  for (const [idx, count] of tally) {
    if (count > maxVotes) { maxVotes = count; winnerIdx = idx }
  }

  const winner = comps[winnerIdx]
  if (!winner) return NextResponse.json({ error: 'Composition invalide' }, { status: 400 })

  // Get member userId map for player name → userId
  const members = await db.select().from(roomMembers).where(eq(roomMembers.roomId, room.id))
  const memberMap = new Map(members.filter(m => m.userId).map(m => [m.playerName.toLowerCase(), m.userId!]))

  const [game] = await db.insert(games).values({
    regionId: room.regionId ?? undefined,
    won: Boolean(won),
    playedAt: playedAt ? new Date(playedAt) : undefined,
  }).returning()

  await db.insert(gamePlayers).values(
    winner.assignments.map(a => ({
      gameId: game.id,
      userId: a.assignedPlayer ? (memberMap.get(a.assignedPlayer.toLowerCase()) ?? null) : null,
      playerName: a.assignedPlayer ?? 'Inconnu',
      championRiotId: a.championRiotId,
      championName: a.championName,
      championImageUrl: a.imageUrl ?? null,
      role: a.role,
    }))
  )

  // Room's job is done once the game is recorded — members/votes cascade-delete with it
  await db.delete(rooms).where(eq(rooms.id, room.id))

  return NextResponse.json({ gameId: game.id })
}
