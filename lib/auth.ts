import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users } from '@/schema'
import { eq } from 'drizzle-orm'

const SECRET = new TextEncoder().encode(process.env.SECRET_KEY ?? 'fallback-dev-secret')
const COOKIE = 'ggt_token'

export const hashPassword = (p: string) => bcrypt.hash(p, 12)
export const verifyPassword = (p: string, hash: string) => bcrypt.compare(p, hash)

export async function createToken(userId: number) {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function getSession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const userId = Number(payload.sub)
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    return user ?? null
  } catch {
    return null
  }
}

export async function setTokenCookie(token: string) {
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function clearTokenCookie() {
  const jar = await cookies()
  jar.delete(COOKIE)
}
