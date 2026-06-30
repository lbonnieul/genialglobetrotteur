import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { regions, champions, championRoles, championRegions } from '@/schema'
import { eq, and } from 'drizzle-orm'
import { getLatestVersion, fetchAllChampions, imageUrl, splashUrl } from '@/lib/ddragon'
import champRegionsData from '@/data/champion_regions.json'
import champRolesData from '@/data/champion_roles.json'

const REGION_NAMES: Record<string, string> = {
  demacia: 'Demacia', noxus: 'Noxus', freljord: 'Freljord', ionia: 'Ionia',
  piltover: 'Piltover', zaun: 'Zaun', bilgewater: 'Bilgewater',
  'shadow-isles': 'Îles obscures', targon: 'Targon', shurima: 'Shurima',
  ixtal: 'Ixtal', void: 'Le Néant', bandlecity: 'Bandle',
}

const REGION_DESCRIPTIONS: Record<string, string> = {
  demacia: 'Un royaume vertueux qui bannit la magie.',
  noxus: 'Un empire brutal fondé sur la puissance.',
  freljord: 'Des terres gelées gouvernées par des tribus en guerre.',
  ionia: 'Une île mystique imprégnée de magie naturelle.',
  piltover: 'La cité du progrès et de l\'hextech.',
  zaun: 'Les bas-fonds industriels et chimiques.',
  bilgewater: 'Un port de pirates et de chasseurs de primes.',
  'shadow-isles': 'Des îles maudites par la Brume Noire.',
  targon: 'Une montagne sacrée gardée par des aspects célestes.',
  shurima: 'Un empire désertique jadis glorieux.',
  ixtal: 'Une civilisation isolée maîtrisant la magie élémentaire.',
  void: 'Une dimension de néant qui consume tout.',
  bandlecity: 'La ville magique et colorée des Yordles.',
}

export async function POST(req: NextRequest) {
  try {
  const { secret } = await req.json()
  if (secret !== process.env.SEED_SECRET)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Seed regions
  for (const [slug, name] of Object.entries(REGION_NAMES)) {
    const existing = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1)
    if (!existing.length) {
      await db.insert(regions).values({
        slug,
        name,
        description: REGION_DESCRIPTIONS[slug] ?? null,
      })
    }
  }

  // Fetch champions from DDragon
  const version = await getLatestVersion()
  const ddragonChamps = await fetchAllChampions(version)

  // Seed champions from roles file
  const rolesData = champRolesData as Record<string, unknown>
  for (const [riotId, roles] of Object.entries(rolesData)) {
    if (riotId === '_note') continue
    if (!Array.isArray(roles)) continue

    const dd = ddragonChamps[riotId]
    const name = dd?.name ?? riotId
    const title = dd?.title ?? null
    const img = dd ? imageUrl(version, dd.image.full) : null
    const splash = splashUrl(riotId)

    let [champ] = await db.select().from(champions).where(eq(champions.riotId, riotId)).limit(1)
    if (!champ) {
      ;[champ] = await db.insert(champions).values({ riotId, name, title, imageUrl: img, splashUrl: splash }).returning()
    } else {
      ;[champ] = await db.update(champions).set({ name, title, imageUrl: img, splashUrl: splash }).where(eq(champions.id, champ.id)).returning()
    }

    // Sync roles
    const existing = await db.select({ role: championRoles.role }).from(championRoles).where(eq(championRoles.championId, champ.id))
    const existingSet = new Set(existing.map(r => r.role))
    const newSet = new Set<string>(roles as string[])
    for (const role of [...existingSet].filter(r => !newSet.has(r)))
      await db.delete(championRoles).where(and(eq(championRoles.championId, champ.id), eq(championRoles.role, role)))
    const toAdd = [...newSet].filter(r => !existingSet.has(r))
    if (toAdd.length)
      await db.insert(championRoles).values(toAdd.map(role => ({ championId: champ.id, role })))
  }

  // Seed champion-region associations
  const regionsDb = await db.select().from(regions)
  const regionBySlug = new Map(regionsDb.map(r => [r.slug, r]))
  const champsDb = await db.select().from(champions)
  const champByRiotId = new Map(champsDb.map(c => [c.riotId, c]))

  const regionMap = champRegionsData as Record<string, unknown>
  for (const [slug, riotIds] of Object.entries(regionMap)) {
    if (slug === '_note') continue
    if (!Array.isArray(riotIds)) continue
    const region = regionBySlug.get(slug)
    if (!region) continue

    for (const riotId of riotIds) {
      const champ = champByRiotId.get(riotId as string)
      if (!champ) continue
      const exists = await db.select().from(championRegions)
        .where(and(eq(championRegions.championId, champ.id), eq(championRegions.regionId, region.id)))
        .limit(1)
      if (!exists.length)
        await db.insert(championRegions).values({ championId: champ.id, regionId: region.id })
    }
  }

  return NextResponse.json({ message: 'Seed terminé avec succès' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[seed]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
