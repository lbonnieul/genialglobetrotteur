import { pgTable, serial, varchar, boolean, integer, timestamp, unique, primaryKey, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  hashedPassword: varchar('hashed_password', { length: 255 }).notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
})

export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  imageUrl: varchar('image_url', { length: 500 }),
})

export const champions = pgTable('champions', {
  id: serial('id').primaryKey(),
  riotId: varchar('riot_id', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  title: varchar('title', { length: 200 }),
  imageUrl: varchar('image_url', { length: 500 }),
  splashUrl: varchar('splash_url', { length: 500 }),
})

export const championRoles = pgTable('champion_role_entries', {
  id: serial('id').primaryKey(),
  championId: integer('champion_id').notNull().references(() => champions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
}, t => [unique('uq_champion_role').on(t.championId, t.role)])

export const championRegions = pgTable('champion_regions', {
  championId: integer('champion_id').notNull().references(() => champions.id, { onDelete: 'cascade' }),
  regionId: integer('region_id').notNull().references(() => regions.id, { onDelete: 'cascade' }),
}, t => [primaryKey({ columns: [t.championId, t.regionId] })])

export const championPreferences = pgTable('champion_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  championRiotId: varchar('champion_riot_id', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  liked: boolean('liked').notNull(),
}, t => [unique('uq_pref_user_champ_role').on(t.userId, t.championRiotId, t.role)])

export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  regionId: integer('region_id').references(() => regions.id, { onDelete: 'set null' }),
  won: boolean('won').notNull(),
  playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
  notes: varchar('notes', { length: 500 }),
})

export const gamePlayers = pgTable('game_players', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  playerName: varchar('player_name', { length: 150 }).notNull(),
  championRiotId: varchar('champion_riot_id', { length: 100 }).notNull(),
  championName: varchar('champion_name', { length: 100 }).notNull(),
  championImageUrl: varchar('champion_image_url', { length: 500 }),
  role: varchar('role', { length: 20 }).notNull(),
})

export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 8 }).notNull().unique(),
  regionId: integer('region_id').references(() => regions.id, { onDelete: 'set null' }),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).notNull().default('waiting'),
  compositions: jsonb('compositions'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const roomMembers = pgTable('room_members', {
  id: serial('id').primaryKey(),
  roomId: integer('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  playerName: varchar('player_name', { length: 100 }).notNull(),
  isGuest: boolean('is_guest').notNull().default(false),
  hasJoined: boolean('has_joined').notNull().default(false),
})

export const roomVotes = pgTable('room_votes', {
  id: serial('id').primaryKey(),
  roomId: integer('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  compositionIndex: integer('composition_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [unique('uq_room_vote').on(t.roomId, t.userId)])

// Relations
export const championsRelations = relations(champions, ({ many }) => ({
  roles: many(championRoles),
  championRegions: many(championRegions),
}))
export const regionsRelations = relations(regions, ({ many }) => ({
  championRegions: many(championRegions),
}))
export const championRegionsRelations = relations(championRegions, ({ one }) => ({
  champion: one(champions, { fields: [championRegions.championId], references: [champions.id] }),
  region: one(regions, { fields: [championRegions.regionId], references: [regions.id] }),
}))
export const championRolesRelations = relations(championRoles, ({ one }) => ({
  champion: one(champions, { fields: [championRoles.championId], references: [champions.id] }),
}))
export const gamesRelations = relations(games, ({ one, many }) => ({
  region: one(regions, { fields: [games.regionId], references: [regions.id] }),
  players: many(gamePlayers),
}))
export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  game: one(games, { fields: [gamePlayers.gameId], references: [games.id] }),
  user: one(users, { fields: [gamePlayers.userId], references: [users.id] }),
}))
export const usersRelations = relations(users, ({ many }) => ({
  preferences: many(championPreferences),
  gamePlayers: many(gamePlayers),
}))
export const championPreferencesRelations = relations(championPreferences, ({ one }) => ({
  user: one(users, { fields: [championPreferences.userId], references: [users.id] }),
}))
