import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { champions, championRoles, championRegions, regions } from '@/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ riotId: string }> }) {
  const { riotId } = await params
  const [champ] = await db.select().from(champions).where(eq(champions.riotId, riotId)).limit(1)
  if (!champ) return NextResponse.json({ error: 'Champion introuvable' }, { status: 404 })

  const roles = await db.select({ role: championRoles.role })
    .from(championRoles).where(eq(championRoles.championId, champ.id))

  const regs = await db
    .select({ id: regions.id, slug: regions.slug, name: regions.name })
    .from(championRegions)
    .innerJoin(regions, eq(regions.id, championRegions.regionId))
    .where(eq(championRegions.championId, champ.id))

  return NextResponse.json({ ...champ, roles, regions: regs })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ riotId: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const { riotId } = await params
  const [champ] = await db.select().from(champions).where(eq(champions.riotId, riotId)).limit(1)
  if (!champ) return NextResponse.json({ error: 'Champion introuvable' }, { status: 404 })

  const body = await req.json()

  if (Array.isArray(body.roles)) {
    const existing = await db.select({ role: championRoles.role })
      .from(championRoles).where(eq(championRoles.championId, champ.id))
    const existingSet = new Set(existing.map(r => r.role))
    const newSet = new Set<string>(body.roles)
    for (const role of [...existingSet].filter(r => !newSet.has(r)))
      await db.delete(championRoles).where(and(eq(championRoles.championId, champ.id), eq(championRoles.role, role)))
    const toAdd = [...newSet].filter(r => !existingSet.has(r))
    if (toAdd.length)
      await db.insert(championRoles).values(toAdd.map(role => ({ championId: champ.id, role })))
  }

  if (Array.isArray(body.regionIds)) {
    const existingRegs = await db.select({ regionId: championRegions.regionId })
      .from(championRegions).where(eq(championRegions.championId, champ.id))
    const existingRegSet = new Set(existingRegs.map(r => r.regionId))
    const newRegSet = new Set<number>(body.regionIds)
    for (const rid of [...existingRegSet].filter(r => !newRegSet.has(r)))
      await db.delete(championRegions).where(and(eq(championRegions.championId, champ.id), eq(championRegions.regionId, rid)))
    const toAddRegs = [...newRegSet].filter(r => !existingRegSet.has(r))
    if (toAddRegs.length)
      await db.insert(championRegions).values(toAddRegs.map(regionId => ({ championId: champ.id, regionId })))
  }

  const updatedRoles = await db.select({ role: championRoles.role })
    .from(championRoles).where(eq(championRoles.championId, champ.id))
  const regs = await db
    .select({ id: regions.id, slug: regions.slug, name: regions.name })
    .from(championRegions)
    .innerJoin(regions, eq(regions.id, championRegions.regionId))
    .where(eq(championRegions.championId, champ.id))

  return NextResponse.json({ ...champ, roles: updatedRoles, regions: regs })
}
