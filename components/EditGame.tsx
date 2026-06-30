'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { PlayerInput } from '@/components/PlayerInput'
import { Trophy, X } from 'lucide-react'
import type { Game, Champion } from '@/lib/types'

const ROLES = ['top', 'jungle', 'mid', 'bot', 'support']

interface KnownPlayer { id: number | null; name: string }

export function EditGame({ game, onClose, onSaved }: {
  game: Game
  onClose: () => void
  onSaved: (updated: Game) => void
}) {
  const [won, setWon] = useState(game.won)
  const [notes, setNotes] = useState(game.notes ?? '')
  const [playedAt, setPlayedAt] = useState(() => game.playedAt.slice(0, 10))
  const [players, setPlayers] = useState(game.players.map(p => ({ ...p })))
  const [champions, setChampions] = useState<Champion[]>([])
  const [knownPlayers, setKnownPlayers] = useState<KnownPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.champions(), api.players()]).then(([c, p]) => {
      setChampions(c)
      setKnownPlayers(p)
    })
  }, [])

  const updatePlayerName = (i: number, name: string, userId: number | null) =>
    setPlayers(ps => ps.map((p, idx) => idx !== i ? p : { ...p, playerName: name, userId }))

  const updateField = (i: number, key: 'championRiotId' | 'role', val: string) =>
    setPlayers(ps => ps.map((p, idx) => {
      if (idx !== i) return p
      if (key === 'championRiotId') {
        const champ = champions.find(c => c.riotId === val)
        return { ...p, championRiotId: val, championName: champ?.name ?? p.championName, championImageUrl: champ?.imageUrl ?? p.championImageUrl }
      }
      return { ...p, [key]: val }
    }))

  const usedChampions = (i: number) => new Set(players.filter((_, idx) => idx !== i).map(p => p.championRiotId).filter(Boolean))
  const usedRoles = (i: number) => new Set(players.filter((_, idx) => idx !== i).map(p => p.role).filter(Boolean))
  const suggestionsFor = (i: number) => knownPlayers.filter(p => !players.some((pl, idx) => idx !== i && pl.playerName.toLowerCase() === p.name.toLowerCase()))

  const handleSave = async () => {
    const valid = players.every(p => p.playerName && p.championRiotId && p.role)
    if (!valid) return setError('Remplissez tous les champs pour chaque joueur.')
    setLoading(true); setError('')
    try {
      const updated = await api.updateGame(game.id, {
        won, notes,
        playedAt: playedAt || undefined,
        players: players.map(p => ({
          id: p.id,
          playerName: p.playerName,
          userId: p.userId ?? null,
          championRiotId: p.championRiotId,
          championName: p.championName,
          championImageUrl: p.championImageUrl ?? undefined,
          role: p.role,
        })),
      })
      onSaved(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ background: 'var(--dark-2)', border: '1px solid var(--gold-dk)', borderRadius: '8px', padding: '20px', marginTop: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px' }}>Modifier la partie</h3>
        <button className="btn btn-ghost" style={{ padding: 4 }} onClick={onClose}><X size={16} /></button>
      </div>

      {/* Won/Loss */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { val: true, label: '🏆 Victoire', color: 'var(--success)', bg: 'rgba(39,174,96,0.15)' },
          { val: false, label: '💀 Défaite', color: 'var(--danger)', bg: 'rgba(192,57,43,0.15)' },
        ].map(({ val, label, color, bg }) => (
          <button key={String(val)} onClick={() => setWon(val)} style={{
            flex: 1, padding: '8px', borderRadius: '3px', cursor: 'pointer',
            border: `1px solid ${won === val ? color : 'var(--dark-4)'}`,
            background: won === val ? bg : 'var(--dark-3)',
            color: won === val ? color : 'var(--text-dim)', fontSize: '13px', fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      {/* Players */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        {players.map((p, i) => (
          <div key={p.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px', alignItems: 'center',
            background: 'var(--dark-3)', padding: '10px', borderRadius: '4px', border: '1px solid var(--dark-4)',
          }}>
            <PlayerInput
              value={p.playerName}
              onChange={(name, userId) => updatePlayerName(i, name, userId)}
              players={suggestionsFor(i)}
            />
            <select className="input" style={{ fontSize: '13px' }}
              value={p.championRiotId} onChange={e => updateField(i, 'championRiotId', e.target.value)}>
              <option value={p.championRiotId}>{p.championName || 'Champion…'}</option>
              {champions.filter(c => c.riotId !== p.championRiotId && !usedChampions(i).has(c.riotId))
                .map(c => <option key={c.riotId} value={c.riotId}>{c.name}</option>)}
            </select>
            <select className="input" style={{ fontSize: '13px' }}
              value={p.role} onChange={e => updateField(i, 'role', e.target.value)}>
              <option value={p.role}>{p.role || 'Rôle…'}</option>
              {ROLES.filter(r => r !== p.role && !usedRoles(i).has(r)).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Date + Notes */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div style={{ flex: '0 0 auto' }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: '13px' }}>Date de la partie</label>
          <input className="input" type="date" value={playedAt} onChange={e => setPlayedAt(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: '13px' }}>Notes (optionnel)</label>
          <input className="input" placeholder="Commentaire sur la partie…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}

      <button className="btn btn-gold" onClick={handleSave} disabled={loading}>
        {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Trophy size={14} />}
        Enregistrer les modifications
      </button>
    </div>
  )
}
