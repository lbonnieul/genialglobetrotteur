import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rooms } from '@/schema'
import { lt } from 'drizzle-orm'

export async function GET() {
  const deleted = await db.delete(rooms).where(lt(rooms.expiresAt, new Date())).returning({ id: rooms.id })
  return NextResponse.json({ deleted: deleted.length })
}
