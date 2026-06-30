const BASE = 'https://ddragon.leagueoflegends.com'

export async function getLatestVersion(): Promise<string> {
  const res = await fetch(`${BASE}/api/versions.json`, { next: { revalidate: 86400 } })
  const versions: string[] = await res.json()
  return versions[0]
}

export async function fetchAllChampions(version: string) {
  const res = await fetch(`${BASE}/cdn/${version}/data/fr_FR/champion.json`)
  const json = await res.json()
  return json.data as Record<string, {
    name: string
    title: string
    tags: string[]
    image: { full: string }
  }>
}

export function imageUrl(version: string, filename: string) {
  return `${BASE}/cdn/${version}/img/champion/${filename}`
}

export function splashUrl(riotId: string) {
  return `${BASE}/cdn/img/champion/splash/${riotId}_0.jpg`
}

const TAG_TO_ROLES: Record<string, string[]> = {
  Fighter: ['top', 'jungle'],
  Tank: ['top', 'support'],
  Mage: ['mid', 'support'],
  Assassin: ['mid', 'jungle'],
  Marksman: ['bot'],
  Support: ['support'],
}

export function tagsToRoles(tags: string[]): string[] {
  const roles = new Set<string>()
  for (const tag of tags)
    for (const role of TAG_TO_ROLES[tag] ?? [])
      roles.add(role)
  return [...roles]
}
