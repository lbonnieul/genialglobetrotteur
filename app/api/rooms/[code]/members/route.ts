import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rooms, roomMembers } from '@/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { code } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1)
  if (!room) return NextResponse.json({ error: 'Room introuvable' }, { status: 404 })
  if (room.createdBy !== session.id && !session.isAdmin)
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  if (room.status !== 'waiting')
    return NextResponse.json({ error: 'La composition des équipes est déjà figée' }, { status: 400 })

  const members = await db.select().from(roomMembers).where(eq(roomMembers.roomId, room.id))
  if (members.length >= 5) return NextResponse.json({ error: 'Room complète (5 joueurs max)' }, { status: 400 })
  if (members.some(m => m.playerName.toLowerCase() === name.trim().toLowerCase()))
    return NextResponse.json({ error: 'Ce joueur est déjà dans la room' }, { status: 400 })

  await db.insert(roomMembers).values({
    roomId: room.id,
    userId: null,
    playerName: name.trim(),
    isGuest: true,
    hasJoined: true,
  })

  return NextResponse.json({ ok: true })
}
