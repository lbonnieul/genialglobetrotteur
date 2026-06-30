import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { games, gamePlayers, regions } from '@/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const { id } = await params
  await db.delete(games).where(eq(games.id, Number(id)))
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const { id } = await params
  const gameId = Number(id)
  const body = await req.json()

  // Update game fields
  const gameUpdates: Partial<typeof games.$inferInsert> = {}
  if (body.won !== undefined) gameUpdates.won = body.won
  if (body.notes !== undefined) gameUpdates.notes = body.notes || null
  if (body.playedAt) gameUpdates.playedAt = new Date(body.playedAt)
  if (Object.keys(gameUpdates).length)
    await db.update(games).set(gameUpdates).where(eq(games.id, gameId))

  // Update players
  if (Array.isArray(body.players)) {
    for (const p of body.players) {
      await db.update(gamePlayers).set({
        playerName: p.playerName,
        userId: p.userId ?? null,
        championRiotId: p.championRiotId,
        championName: p.championName,
        championImageUrl: p.championImageUrl ?? null,
        role: p.role,
      }).where(eq(gamePlayers.id, p.id))
    }
  }

  // Return updated game
  const [game] = await db.select({
    id: games.id, regionId: games.regionId, won: games.won,
    playedAt: games.playedAt, notes: games.notes, regionName: regions.name,
  }).from(games).leftJoin(regions, eq(regions.id, games.regionId)).where(eq(games.id, gameId)).limit(1)

  const ps = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId))

  return NextResponse.json({ ...game, playedAt: game.playedAt.toISOString(), players: ps })
}
