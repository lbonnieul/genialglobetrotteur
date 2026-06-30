import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/schema'

// prepare: false requis pour le pooler Supabase en mode transaction
const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema })
