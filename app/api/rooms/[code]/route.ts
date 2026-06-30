import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rooms, roomMembers, roomVotes, regions } from '@/schema'
import { eq } from 'drizzle-orm'

type Ctx = { params: Promise<{ code: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { code } = await params

  const [room] = await db.select({
    id: rooms.id, code: rooms.code, regionId: rooms.regionId,
    createdBy: rooms.createdBy, status: rooms.status,
    compositions: rooms.compositions, expiresAt: rooms.expiresAt,
    regionName: regions.name,
  })
    .from(rooms)
    .leftJoin(regions, eq(regions.id, rooms.regionId))
    .where(eq(rooms.code, code))
    .limit(1)

  if (!room) return NextResponse.json({ error: 'Room introuvable' }, { status: 404 })

  const members = await db.select().from(roomMembers).where(eq(roomMembers.roomId, room.id))
  const votes = await db.select({
    userId: roomVotes.userId,
    compositionIndex: roomVotes.compositionIndex,
  }).from(roomVotes).where(eq(roomVotes.roomId, room.id))

  return NextResponse.json({
    ...room,
    expiresAt: room.expiresAt.toISOString(),
    members,
    votes,
  })
}
