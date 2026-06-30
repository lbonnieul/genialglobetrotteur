import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { games } from '@/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const { id } = await params
  await db.delete(games).where(eq(games.id, Number(id)))
  return NextResponse.json({ ok: true })
}
