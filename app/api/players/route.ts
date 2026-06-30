import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, gamePlayers } from '@/schema'
import { isNull } from 'drizzle-orm'

export async function GET() {
  const [allUsers, guestRows] = await Promise.all([
    db.select({ id: users.id, name: users.username }).from(users),
    db.select({ name: gamePlayers.playerName }).from(gamePlayers).where(isNull(gamePlayers.userId)),
  ])

  const userNames = new Set(allUsers.map(u => u.name.toLowerCase()))

  // Guests: unique names not already covered by a registered user
  const guests = [...new Map(
    guestRows
      .filter(r => !userNames.has(r.name.toLowerCase()))
      .map(r => [r.name.toLowerCase(), { id: null as number | null, name: r.name }])
  ).values()]

  const result = [
    ...allUsers.map(u => ({ id: u.id, name: u.name })),
    ...guests,
  ]

  return NextResponse.json(result)
}
