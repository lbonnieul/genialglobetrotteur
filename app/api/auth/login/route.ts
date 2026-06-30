import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword, createToken, setTokenCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password)
    return NextResponse.json({ error: 'Champs requis' }, { status: 400 })

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
  if (!user || !(await verifyPassword(password, user.hashedPassword)))
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })

  const token = await createToken(user.id)
  await setTokenCookie(token)
  return NextResponse.json({ id: user.id, username: user.username, isAdmin: user.isAdmin })
}
