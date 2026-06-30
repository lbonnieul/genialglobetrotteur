import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { regions, champions, championRegions, championRoles } from '@/schema'
import { eq } from 'drizzle-orm'
import { buildCompositions } from '@/lib/composition'

export async function POST(req: NextRequest) {
  const { regionSlug, players, numSuggestions = 3 } = await req.json()

  const [region] = await db.select().from(regions).where(eq(regions.slug, regionSlug)).limit(1)
  if (!region) return NextResponse.json({ error: 'Région introuvable' }, { status: 404 })

  const rows = await db
    .select({
      champId: champions.id,
      riotId: champions.riotId,
      name: champions.name,
      imageUrl: champions.imageUrl,
      role: championRoles.role,
    })
    .from(championRegions)
    .innerJoin(champions, eq(champions.id, championRegions.championId))
    .leftJoin(championRoles, eq(championRoles.championId, champions.id))
    .where(eq(championRegions.regionId, region.id))

  const champMap = new Map<number, { riotId: string; name: string; imageUrl: string | null; roles: string[] }>()
  for (const r of rows) {
    if (!champMap.has(r.champId))
      champMap.set(r.champId, { riotId: r.riotId, name: r.name, imageUrl: r.imageUrl, roles: [] })
    if (r.role) champMap.get(r.champId)!.roles.push(r.role)
  }

  const champList = [...champMap.values()]
  const compositions = buildCompositions(players ?? [], champList, numSuggestions)

  return NextResponse.json({ compositions })
}
