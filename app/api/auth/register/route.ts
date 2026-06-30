import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, createToken, setTokenCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password)
    return NextResponse.json({ error: 'Champs requis' }, { status: 400 })

  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1)
  if (existing.length)
    return NextResponse.json({ error: 'Pseudo déjà pris' }, { status: 409 })

  const isAdmin = (await db.select().from(users).limit(1)).length === 0
  const [user] = await db.insert(users).values({
    username,
    hashedPassword: await hashPassword(password),
    isAdmin,
  }).returning()

  const token = await createToken(user.id)
  await setTokenCookie(token)
  return NextResponse.json({ id: user.id, username: user.username, isAdmin: user.isAdmin }, { status: 201 })
}
