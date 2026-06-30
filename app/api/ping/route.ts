import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { regions } from '@/schema'
import { sql } from 'drizzle-orm'

export async function GET() {
  await db.select({ one: sql`1` }).from(regions).limit(1)
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
