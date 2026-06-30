import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/schema'
import { eq } from 'drizzle-orm'
import { getSession, hashPassword } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const updates: Partial<typeof users.$inferInsert> = {}

  if (body.username) {
    const existing = await db.select().from(users).where(eq(users.username, body.username)).limit(1)
    if (existing.length && existing[0].id !== session.id)
      return NextResponse.json({ error: 'Pseudo déjà pris' }, { status: 409 })
    updates.username = body.username
  }

  if (body.password) {
    updates.hashedPassword = await hashPassword(body.password)
  }

  if (!Object.keys(updates).length)
    return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 })

  const [updated] = await db.update(users).set(updates).where(eq(users.id, session.id)).returning()
  return NextResponse.json({ id: updated.id, username: updated.username, isAdmin: updated.isAdmin })
}
