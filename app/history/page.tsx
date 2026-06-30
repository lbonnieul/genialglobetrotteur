'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { EditGame } from '@/components/EditGame'
import { Search, Trash2, Pencil } from 'lucide-react'
import type { Game, Region } from '@/lib/types'

const ROLE_ORDER = ['top', 'jungle', 'mid', 'bot', 'support']

export default function HistoryPage() {
  const { user } = useAuthStore()
  const [games, setGames] = useState<Game[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [playerFilter, setPlayerFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [wonFilter, setWonFilter] = useState('')

  useEffect(() => { api.regions().then(setRegions) }, [])

  useEffect(() => {
    setLoading(true)
    api.games().then(all => {
      let filtered = all
      if (regionFilter) filtered = filtered.filter(g => String(g.regionId) === regionFilter)
      if (wonFilter !== '') filtered = filtered.filter(g => String(g.won) === wonFilter)
      if (playerFilter) {
        const lc = playerFilter.toLowerCase()
        filtered = filtered.filter(g => g.players.some(p => p.playerName.toLowerCase().includes(lc)))
      }
      setGames(filtered)
    }).finally(() => setLoading(false))
  }, [playerFilter, regionFilter, wonFilter])

  const updateGame = (updated: Game) =>
    setGames(gs => gs.map(g => g.id === updated.id ? updated : g))

  return (
    <main className="main-content">
      <h2 style={{ marginBottom: '4px' }}>Historique des parties</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '24px' }}>
        Toutes les parties enregistrées par la communauté.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="input" style={{ paddingLeft: '28px', width: 180 }}
            placeholder="Joueur…" value={playerFilter} onChange={e => setPlayerFilter(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
          <option value="">Toutes les régions</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="input" style={{ width: 140 }} value={wonFilter} onChange={e => setWonFilter(e.target.value)}>
          <option value="">V &amp; D</option>
          <option value="true">🏆 Victoires</option>
          <option value="false">💀 Défaites</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Aucune partie enregistrée.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {games.map(g => (
            <GameCard key={g.id} game={g} isAdmin={user?.isAdmin}
              onUpdate={updateGame}
              onDelete={async (id) => {
                if (!confirm('Supprimer cette partie ?')) return
                await api.deleteGame(id)
                setGames(gs => gs.filter(x => x.id !== id))
              }}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function GameCard({ game, isAdmin, onDelete, onUpdate }: {
  game: Game
  isAdmin?: boolean
  onDelete?: (id: number) => void
  onUpdate?: (updated: Game) => void
}) {
  const [editing, setEditing] = useState(false)
  const date = new Date(game.playedAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

  return (
    <div style={{
      background: 'var(--dark-3)',
      border: `1px solid ${game.won ? 'rgba(46,204,120,0.2)' : 'rgba(232,64,64,0.2)'}`,
      borderLeft: `3px solid ${game.won ? 'var(--success)' : 'var(--danger)'}`,
      borderRadius: '10px', padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>{game.won ? '🏆' : '💀'}</span>
          <div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", color: 'var(--text-lt)', fontSize: '14px', fontWeight: 600 }}>
              {game.regionName ?? 'Région inconnue'}
            </span>
            <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: 2 }}>{date}</div>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-ghost" style={{ padding: 4 }}
              onClick={() => setEditing(e => !e)} title="Modifier">
              <Pencil size={14} style={{ color: editing ? 'var(--gold)' : undefined }} />
            </button>
            {onDelete && (
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => onDelete(game.id)}>
                <Trash2 size={14} style={{ color: 'var(--danger)' }} />
              </button>
            )}
          </div>
        )}
      </div>

      {game.notes && !editing && (
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px', fontStyle: 'italic' }}>
          "{game.notes}"
        </div>
      )}

      {!editing && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[...game.players].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)).map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--dark-4)', borderRadius: '8px', padding: '5px 8px',
            }}>
              {p.championImageUrl && (
                <img src={p.championImageUrl} alt={p.championName}
                  style={{ width: 28, height: 28, borderRadius: 2, objectFit: 'cover' }} />
              )}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-lt)', fontWeight: 600 }}>{p.playerName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {p.championName} ·
                  <span className={`role-badge role-${p.role}`} style={{ fontSize: '10px', padding: '1px 5px' }}>
                    {p.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && onUpdate && (
        <EditGame
          game={game}
          onClose={() => setEditing(false)}
          onSaved={(updated) => { onUpdate(updated); setEditing(false) }}
        />
      )}
    </div>
  )
}
