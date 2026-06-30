import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { championPreferences } from '@/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const prefs = await db.select({
    championRiotId: championPreferences.championRiotId,
    role: championPreferences.role,
    liked: championPreferences.liked,
  }).from(championPreferences).where(eq(championPreferences.userId, session.id))

  return NextResponse.json(prefs)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { championRiotId, role, liked } = await req.json()

  if (liked === null || liked === undefined) {
    await db.delete(championPreferences).where(
      and(
        eq(championPreferences.userId, session.id),
        eq(championPreferences.championRiotId, championRiotId),
        eq(championPreferences.role, role)
      )
    )
    return NextResponse.json(null)
  }

  const [existing] = await db.select()
    .from(championPreferences)
    .where(and(
      eq(championPreferences.userId, session.id),
      eq(championPreferences.championRiotId, championRiotId),
      eq(championPreferences.role, role)
    ))
    .limit(1)

  if (existing) {
    const [updated] = await db.update(championPreferences)
      .set({ liked })
      .where(eq(championPreferences.id, existing.id))
      .returning()
    return NextResponse.json({ championRiotId: updated.championRiotId, role: updated.role, liked: updated.liked })
  }

  const [created] = await db.insert(championPreferences)
    .values({ userId: session.id, championRiotId, role, liked })
    .returning()
  return NextResponse.json({ championRiotId: created.championRiotId, role: created.role, liked: created.liked }, { status: 201 })
}
