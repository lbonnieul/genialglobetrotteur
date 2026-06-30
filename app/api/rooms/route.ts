import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rooms, roomMembers } from '@/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O to avoid confusion
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { regionId } = await req.json()
  if (!regionId) return NextResponse.json({ error: 'Région requise' }, { status: 400 })

  let code = generateCode()
  // Retry on collision (extremely rare)
  for (let i = 0; i < 5; i++) {
    const existing = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1)
    if (!existing.length) break
    code = generateCode()
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2h

  const [room] = await db.insert(rooms).values({
    code, regionId, createdBy: session.id, expiresAt,
  }).returning()

  await db.insert(roomMembers).values({
    roomId: room.id,
    userId: session.id,
    playerName: session.username,
    isGuest: false,
    hasJoined: true,
  })

  return NextResponse.json({ code })
}
