import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { games, gamePlayers, regions } from '@/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const allGames = await db.select({
    id: games.id,
    regionId: games.regionId,
    won: games.won,
    playedAt: games.playedAt,
    notes: games.notes,
    regionName: regions.name,
  })
    .from(games)
    .leftJoin(regions, eq(regions.id, games.regionId))
    .orderBy(desc(games.playedAt))

  const playerRows = await db.select().from(gamePlayers)

  const playersByGame = new Map<number, typeof playerRows>()
  for (const p of playerRows) {
    if (!playersByGame.has(p.gameId)) playersByGame.set(p.gameId, [])
    playersByGame.get(p.gameId)!.push(p)
  }

  return NextResponse.json(allGames.map(g => ({
    ...g,
    playedAt: g.playedAt.toISOString(),
    players: playersByGame.get(g.id) ?? [],
  })))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { regionId, won, notes, playedAt, players } = await req.json()

  const [game] = await db.insert(games).values({
    regionId, won, notes,
    playedAt: playedAt ? new Date(playedAt) : undefined,
  }).returning()

  if (players?.length) {
    await db.insert(gamePlayers).values(
      players.map((p: {
        userId?: number | null
        playerName: string
        championRiotId: string
        championName: string
        championImageUrl?: string
        role: string
      }) => ({
        gameId: game.id,
        userId: p.userId ?? null,
        playerName: p.playerName,
        championRiotId: p.championRiotId,
        championName: p.championName,
        championImageUrl: p.championImageUrl ?? null,
        role: p.role,
      }))
    )
  }

  const ps = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, game.id))
  const [reg] = regionId
    ? await db.select({ name: regions.name }).from(regions).where(eq(regions.id, regionId)).limit(1)
    : [null]

  return NextResponse.json({
    ...game,
    playedAt: game.playedAt.toISOString(),
    regionName: reg?.name ?? null,
    players: ps,
  }, { status: 201 })
}
