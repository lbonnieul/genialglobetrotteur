import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { regions, champions, championRegions, championRoles } from '@/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [region] = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1)
  if (!region) return NextResponse.json({ error: 'Région introuvable' }, { status: 404 })

  const rows = await db
    .select({
      champId: champions.id,
      riotId: champions.riotId,
      name: champions.name,
      title: champions.title,
      imageUrl: champions.imageUrl,
      splashUrl: champions.splashUrl,
      role: championRoles.role,
    })
    .from(championRegions)
    .innerJoin(champions, eq(champions.id, championRegions.championId))
    .leftJoin(championRoles, eq(championRoles.championId, champions.id))
    .where(eq(championRegions.regionId, region.id))

  const champMap = new Map<number, {
    id: number; riotId: string; name: string; title: string | null
    imageUrl: string | null; splashUrl: string | null; roles: { role: string }[]
  }>()
  for (const r of rows) {
    if (!champMap.has(r.champId)) {
      champMap.set(r.champId, {
        id: r.champId, riotId: r.riotId, name: r.name, title: r.title,
        imageUrl: r.imageUrl, splashUrl: r.splashUrl, roles: [],
      })
    }
    if (r.role) champMap.get(r.champId)!.roles.push({ role: r.role })
  }

  return NextResponse.json({ ...region, champions: [...champMap.values()] })
}
