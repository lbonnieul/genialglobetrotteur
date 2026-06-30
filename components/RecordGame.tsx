'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Plus, Trash2, Trophy, X } from 'lucide-react'
import type { Champion } from '@/lib/types'

const ROLES = ['top', 'jungle', 'mid', 'bot', 'support']
const ROLE_ICONS: Record<string, string> = { top: '🛡️', jungle: '🌲', mid: '⚡', bot: '🏹', support: '💠' }

interface PlayerRow {
  playerName: string
  championRiotId: string
  championName: string
  championImageUrl: string
  role: string
  userId: number | null
}

export function RecordGame({ regionId, regionName, champions, onClose, onSaved }: {
  regionId: number
  regionName: string
  champions: Champion[]
  onClose?: () => void
  onSaved?: () => void
}) {
  const { user } = useAuthStore()
  const [won, setWon] = useState(true)
  const [notes, setNotes] = useState('')
  const [players, setPlayers] = useState<PlayerRow[]>([
    { playerName: user?.username ?? '', championRiotId: '', championName: '', championImageUrl: '', role: '', userId: user?.id ?? null }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addPlayer = () => {
    if (players.length >= 5) return
    setPlayers(p => [...p, { playerName: '', championRiotId: '', championName: '', championImageUrl: '', role: '', userId: null }])
  }

  const removePlayer = (i: number) => setPlayers(p => p.filter((_, idx) => idx !== i))

  const updatePlayer = (i: number, key: keyof PlayerRow, val: string) => {
    setPlayers(p => p.map((pl, idx) => {
      if (idx !== i) return pl
      if (key === 'championRiotId') {
        const champ = champions.find(c => c.riotId === val)
        return { ...pl, championRiotId: val, championName: champ?.name ?? '', championImageUrl: champ?.imageUrl ?? '' }
      }
      return { ...pl, [key]: val }
    }))
  }

  const handleSave = async () => {
    const valid = players.every(p => p.playerName && p.championRiotId && p.role)
    if (!valid) return setError('Remplissez tous les champs pour chaque joueur.')
    setLoading(true); setError('')
    try {
      await api.createGame({
        regionId,
        won,
        notes: notes || undefined,
        players: players.map(p => ({
          userId: p.userId,
          playerName: p.playerName,
          championRiotId: p.championRiotId,
          championName: p.championName,
          championImageUrl: p.championImageUrl || undefined,
          role: p.role,
        })),
      })
      onSaved?.()
      onClose?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    } finally { setLoading(false) }
  }

  return (
    <div style={{ background: 'var(--dark-2)', border: '1px solid var(--gold-dk)', borderRadius: '6px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px' }}>📋 Enregistrer une partie — {regionName}</h3>
        {onClose && (
          <button className="btn btn-ghost" style={{ padding: 4 }} onClick={onClose}><X size={16} /></button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { val: true, label: '🏆 Victoire', color: 'var(--success)', bg: 'rgba(39,174,96,0.15)' },
          { val: false, label: '💀 Défaite', color: 'var(--danger)', bg: 'rgba(192,57,43,0.15)' },
        ].map(({ val, label, color, bg }) => (
          <button key={String(val)} onClick={() => setWon(val)} style={{
            flex: 1, padding: '10px', borderRadius: '3px', cursor: 'pointer',
            border: `1px solid ${won === val ? color : 'var(--dark-4)'}`,
            background: won === val ? bg : 'var(--dark-3)',
            color: won === val ? color : 'var(--text-dim)', fontSize: '14px', fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {players.map((p, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
            gap: '8px', alignItems: 'center',
            background: 'var(--dark-3)', padding: '10px', borderRadius: '4px', border: '1px solid var(--dark-4)',
          }}>
            <input className="input" style={{ fontSize: '13px' }} placeholder="Pseudo joueur"
              value={p.playerName} onChange={e => updatePlayer(i, 'playerName', e.target.value)} />
            <select className="input" style={{ fontSize: '13px' }}
              value={p.championRiotId} onChange={e => updatePlayer(i, 'championRiotId', e.target.value)}>
              <option value="">Champion…</option>
              {champions.map(c => <option key={c.riotId} value={c.riotId}>{c.name}</option>)}
            </select>
            <select className="input" style={{ fontSize: '13px' }}
              value={p.role} onChange={e => updatePlayer(i, 'role', e.target.value)}>
              <option value="">Rôle…</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_ICONS[r]} {r}</option>)}
            </select>
            {players.length > 1
              ? <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => removePlayer(i)}><Trash2 size={14} /></button>
              : <div />}
          </div>
        ))}
      </div>

      {players.length < 5 && (
        <button className="btn btn-ghost" style={{ marginBottom: '12px', fontSize: '12px' }} onClick={addPlayer}>
          <Plus size={13} /> Ajouter un joueur
        </button>
      )}

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Notes (optionnel)</label>
        <input className="input" placeholder="Commentaire sur la partie…" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}

      <button className="btn btn-gold" onClick={handleSave} disabled={loading}>
        {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Trophy size={14} />}
        Enregistrer la partie
      </button>
    </div>
  )
}
