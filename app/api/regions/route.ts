import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { regions } from '@/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  const rows = await db.select().from(regions).orderBy(asc(regions.name))
  return NextResponse.json(rows)
}
