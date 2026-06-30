import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rooms, roomMembers, roomVotes } from '@/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { code } = await params
  const { compositionIndex } = await req.json()

  const [room] = await db.select({ id: rooms.id, status: rooms.status })
    .from(rooms).where(eq(rooms.code, code)).limit(1)
  if (!room) return NextResponse.json({ error: 'Room introuvable' }, { status: 404 })
  if (room.status !== 'voting') return NextResponse.json({ error: 'Pas en phase de vote' }, { status: 400 })

  const [member] = await db.select().from(roomMembers)
    .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, session.id)))
    .limit(1)
  if (!member || !member.hasJoined)
    return NextResponse.json({ error: 'Tu ne fais pas partie de cette room' }, { status: 403 })

  const [existing] = await db.select().from(roomVotes)
    .where(and(eq(roomVotes.roomId, room.id), eq(roomVotes.userId, session.id)))
    .limit(1)

  if (existing) {
    await db.update(roomVotes).set({ compositionIndex })
      .where(and(eq(roomVotes.roomId, room.id), eq(roomVotes.userId, session.id)))
  } else {
    await db.insert(roomVotes).values({ roomId: room.id, userId: session.id, compositionIndex })
  }

  return NextResponse.json({ ok: true })
}
