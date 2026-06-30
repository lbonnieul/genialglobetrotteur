import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { champions, championRoles, championRegions, regions } from '@/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  const rows = await db
    .select({
      champId: champions.id,
      riotId: champions.riotId,
      name: champions.name,
      title: champions.title,
      imageUrl: champions.imageUrl,
      splashUrl: champions.splashUrl,
      role: championRoles.role,
      regionId: regions.id,
      regionSlug: regions.slug,
      regionName: regions.name,
    })
    .from(champions)
    .leftJoin(championRoles, eq(championRoles.championId, champions.id))
    .leftJoin(championRegions, eq(championRegions.championId, champions.id))
    .leftJoin(regions, eq(regions.id, championRegions.regionId))
    .orderBy(asc(champions.name))

  const map = new Map<number, {
    id: number; riotId: string; name: string; title: string | null
    imageUrl: string | null; splashUrl: string | null
    roles: { role: string }[]; regions: { id: number; slug: string; name: string }[]
  }>()

  for (const r of rows) {
    if (!map.has(r.champId)) {
      map.set(r.champId, {
        id: r.champId, riotId: r.riotId, name: r.name, title: r.title,
        imageUrl: r.imageUrl, splashUrl: r.splashUrl, roles: [], regions: [],
      })
    }
    const c = map.get(r.champId)!
    if (r.role && !c.roles.find(x => x.role === r.role)) c.roles.push({ role: r.role })
    if (r.regionId && !c.regions.find(x => x.id === r.regionId))
      c.regions.push({ id: r.regionId, slug: r.regionSlug!, name: r.regionName! })
  }

  return NextResponse.json([...map.values()])
}
