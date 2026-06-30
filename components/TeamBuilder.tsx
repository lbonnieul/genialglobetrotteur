'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { PlayerInput } from '@/components/PlayerInput'
import { Trash2, Zap, Users, ThumbsUp } from 'lucide-react'
import type { Composition, ChampionAssignment } from '@/lib/types'


interface Member { name: string; userId: number | null }
interface KnownPlayer { id: number | null; name: string }

export function TeamBuilder({ regionSlug, regionName }: { regionSlug: string; regionName: string }) {
  const { user, preferences } = useAuthStore()
  const [members, setMembers] = useState<Member[]>(
    user ? [{ name: user.username, userId: user.id }] : []
  )
  const [newName, setNewName] = useState('')
  const [newUserId, setNewUserId] = useState<number | null>(null)
  const [knownPlayers, setKnownPlayers] = useState<KnownPlayer[]>([])
  const [compositions, setCompositions] = useState<Composition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.players().then(setKnownPlayers) }, [])

  // Filter out already-added members from suggestions
  const suggestions = knownPlayers.filter(p => !members.some(m => m.name.toLowerCase() === p.name.toLowerCase()))

  const addMember = () => {
    const name = newName.trim()
    if (!name) return
    if (members.length >= 5) return setError('Maximum 5 joueurs')
    setMembers(m => [...m, { name, userId: newUserId }])
    setNewName('')
    setNewUserId(null)
    setError('')
  }

  const remove = (i: number) => setMembers(m => m.filter((_, idx) => idx !== i))

  const generate = async () => {
    if (!members.length) return setError('Ajoutez au moins 1 joueur')
    setLoading(true); setError('')
    try {
      // Pour les joueurs avec compte on charge leurs préférences depuis l'API
      // Pour le user connecté on utilise le store (déjà chargé)
      const playerPrefs: Record<number, Record<string, boolean>> = {}

      // Load preferences for other registered members (not current user)
      const otherUserIds = members
        .filter(m => m.userId && m.userId !== user?.id)
        .map(m => m.userId!)

      if (otherUserIds.length > 0) {
        // We can only access our own preferences from API — others default to neutral
        // (privacy: we don't expose other users' preferences)
      }

      const currentUserPrefsMap: Record<string, boolean> = {}
      for (const p of preferences) currentUserPrefsMap[`${p.championRiotId}:${p.role}`] = p.liked

      const players = members.map(m => ({
        name: m.name,
        preferences: m.userId === user?.id ? currentUserPrefsMap : {},
      }))

      const res = await api.compositions({ regionSlug, players })
      setCompositions(res.compositions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du calcul')
    } finally { setLoading(false) }
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>⚔️ Monter une équipe — {regionName}</h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        {members.map((m, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--dark-4)', border: `1px solid ${m.userId ? 'var(--gold-dk)' : 'var(--border-2)'}`,
            borderRadius: '8px', padding: '5px 10px', fontSize: '13px',
          }}>
            <Users size={12} style={{ color: m.userId ? 'var(--gold)' : 'var(--text-dim)' }} />
            <span style={{ color: 'var(--text-lt)' }}>{m.name}</span>
            <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', lineHeight: 1, display: 'flex' }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {members.length < 5 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <PlayerInput
            value={newName}
            onChange={(name, userId) => { setNewName(name); setNewUserId(userId) }}
            players={suggestions}
            placeholder="Ajouter un joueur…"
            style={{ maxWidth: '260px' }}
          />
          <button className="btn btn-outline" onClick={addMember} disabled={!newName.trim()}>
            Ajouter
          </button>
        </div>
      )}

      {error && <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}

      <button className="btn btn-gold" onClick={generate} disabled={loading}>
        {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Zap size={14} />}
        Générer les compositions
      </button>

      {compositions.length > 0 && <CompositionResults compositions={compositions} />}
    </div>
  )
}

function CompositionResults({ compositions }: { compositions: Composition[] }) {
  const [active, setActive] = useState(0)
  const comp = compositions[active]

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ height: 1, background: 'var(--border)', margin: '0 0 16px' }} />
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {compositions.map((c, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            padding: '5px 14px', borderRadius: '8px', cursor: 'pointer',
            border: `1px solid ${i === active ? 'var(--gold)' : 'var(--border)'}`,
            background: i === active ? 'var(--gold-glow)' : 'transparent',
            color: i === active ? 'var(--gold-lt)' : 'var(--text)', fontSize: '12px',
            fontWeight: i === active ? 600 : 400,
          }}>
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '10px' }}>
        {comp.assignments.map((a, i) => <AssignmentCard key={i} a={a} />)}
      </div>
    </div>
  )
}

function AssignmentCard({ a }: { a: ChampionAssignment }) {
  return (
    <div style={{ background: 'var(--dark-4)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
      {a.imageUrl && (
        <img src={a.imageUrl} alt={a.championName}
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '8px' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 700, color: 'var(--text-lt)', marginBottom: '6px' }}>
          {a.championName}
        </div>
        <span className={`role-badge role-${a.role}`}>{a.role}</span>
        <div style={{ marginTop: '8px', minHeight: '22px' }}>
          {a.assignedPlayer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-lt)', fontWeight: 600 }}>
              <ThumbsUp size={11} style={{ color: 'var(--success)', flexShrink: 0 }} />
              {a.assignedPlayer}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Pas de joueur assigné</div>
          )}
        </div>
      </div>
    </div>
  )
}
