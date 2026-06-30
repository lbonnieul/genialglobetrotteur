import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rooms, roomMembers } from '@/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { code } = await params
  const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1)
  if (!room) return NextResponse.json({ error: 'Room introuvable' }, { status: 404 })

  const [existing] = await db.select().from(roomMembers)
    .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, session.id)))
    .limit(1)
  if (existing) return NextResponse.json({ ok: true })

  const members = await db.select().from(roomMembers).where(eq(roomMembers.roomId, room.id))
  if (members.length >= 5) return NextResponse.json({ error: 'Room complète (5 joueurs max)' }, { status: 400 })

  await db.insert(roomMembers).values({
    roomId: room.id,
    userId: session.id,
    playerName: session.username,
    isGuest: false,
    hasJoined: true,
  })

  return NextResponse.json({ ok: true })
}
