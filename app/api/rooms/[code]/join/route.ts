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

  const [member] = await db.select().from(roomMembers)
    .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, session.id)))
    .limit(1)

  if (!member) return NextResponse.json({ error: 'Tu ne fais pas partie de cette room' }, { status: 403 })
  if (member.hasJoined) return NextResponse.json({ ok: true })

  await db.update(roomMembers).set({ hasJoined: true })
    .where(eq(roomMembers.id, member.id))

  return NextResponse.json({ ok: true })
}
