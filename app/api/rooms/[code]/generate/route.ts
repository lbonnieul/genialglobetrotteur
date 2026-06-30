import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rooms, roomMembers, regions, champions, championRegions, championRoles, championPreferences } from '@/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { buildCompositions } from '@/lib/composition'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { code } = await params
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1)
  if (!room) return NextResponse.json({ error: 'Room introuvable' }, { status: 404 })
  if (room.createdBy !== session.id && !session.isAdmin)
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const members = await db.select().from(roomMembers).where(eq(roomMembers.roomId, room.id))

  // Fetch champions for the region
  const rows = await db.select({
    champId: champions.id,
    riotId: champions.riotId,
    name: champions.name,
    imageUrl: champions.imageUrl,
    role: championRoles.role,
  })
    .from(championRegions)
    .innerJoin(champions, eq(champions.id, championRegions.championId))
    .leftJoin(championRoles, eq(championRoles.championId, champions.id))
    .where(eq(championRegions.regionId, room.regionId!))

  const champMap = new Map<number, { riotId: string; name: string; imageUrl: string | null; roles: string[] }>()
  for (const r of rows) {
    if (!champMap.has(r.champId))
      champMap.set(r.champId, { riotId: r.riotId, name: r.name, imageUrl: r.imageUrl, roles: [] })
    if (r.role) champMap.get(r.champId)!.roles.push(r.role)
  }
  const champList = [...champMap.values()]

  // Get preferences for registered joined members
  const registeredIds = members.filter(m => m.userId && m.hasJoined).map(m => m.userId!)
  const allPrefs = registeredIds.length
    ? await db.select().from(championPreferences).where(inArray(championPreferences.userId, registeredIds))
    : []

  const prefsByUser = new Map<number, { championRiotId: string; role: string; liked: boolean }[]>()
  for (const p of allPrefs) {
    if (!prefsByUser.has(p.userId)) prefsByUser.set(p.userId, [])
    prefsByUser.get(p.userId)!.push(p)
  }

  const players = members.map(m => ({
    name: m.playerName,
    preferences: m.userId && m.hasJoined
      ? Object.fromEntries((prefsByUser.get(m.userId) ?? []).map(p => [`${p.championRiotId}:${p.role}`, p.liked]))
      : {} as Record<string, boolean>,
  }))

  const compositions = buildCompositions(players, champList, 3)

  await db.update(rooms).set({ compositions, status: 'voting' }).where(eq(rooms.id, room.id))

  return NextResponse.json({ compositions })
}
