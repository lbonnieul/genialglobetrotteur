'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Copy, Check, Zap, Trophy, Users, UserPlus } from 'lucide-react'
import type { Room, Composition } from '@/lib/types'

const ROLE_ORDER = ['top', 'jungle', 'mid', 'bot', 'support']

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { user } = useAuthStore()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [joining, setJoining] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [wonChoice, setWonChoice] = useState<boolean | null>(null)
  const [playedAtChoice, setPlayedAtChoice] = useState(() => new Date().toISOString().slice(0, 10))
  const [guestName, setGuestName] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)

  const fetchRoom = useCallback(async () => {
    try {
      const r = await api.getRoom(code)
      setRoom(r)
    } catch {
      setError('Room introuvable ou expirée.')
    }
  }, [code])

  useEffect(() => {
    fetchRoom()
    const interval = setInterval(fetchRoom, 2500)
    return () => clearInterval(interval)
  }, [fetchRoom])

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoin = async () => {
    setJoining(true)
    try { await api.joinRoom(code); await fetchRoom() }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setJoining(false) }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try { await fetchRoom() }
    catch { /* ignore */ }
    try { await api.generateCompositions(code); await fetchRoom() }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setGenerating(false) }
  }

  const handleAddGuest = async () => {
    if (!guestName.trim()) return
    setAddingGuest(true)
    try {
      await api.addRoomMember(code, guestName.trim())
      setGuestName('')
      await fetchRoom()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally { setAddingGuest(false) }
  }

  const handleVote = async (idx: number) => {
    try { await api.voteComposition(code, idx); await fetchRoom() }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
  }

  const handleSave = async () => {
    if (wonChoice === null) return setError('Indique si vous avez gagné ou perdu.')
    setSaving(true)
    try {
      await api.saveRoomAsGame(code, { won: wonChoice, playedAt: playedAtChoice })
      router.push('/history')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally { setSaving(false) }
  }

  if (error && !room) {
    return (
      <main className="main-content" style={{ maxWidth: 600 }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      </main>
    )
  }

  if (!room) {
    return (
      <main className="main-content" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="spinner" />
      </main>
    )
  }

  const isCreator = user?.id === room.createdBy
  const myMember = room.members.find(m => m.userId === user?.id)
  const canJoin = !!user && !myMember && room.status !== 'done' && room.members.length < 5
  const myVote = room.votes.find(v => v.userId === user?.id)

  // Vote tally
  const tally = new Map<number, number>()
  for (const v of room.votes) tally.set(v.compositionIndex, (tally.get(v.compositionIndex) ?? 0) + 1)
  const maxTally = Math.max(0, ...tally.values())

  return (
    <main className="main-content" style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Users size={20} style={{ color: 'var(--gold)' }} />
            <h2 style={{ margin: 0 }}>Room — {room.regionName ?? '…'}</h2>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
            {room.status === 'waiting' && 'En attente que tout le monde rejoigne…'}
            {room.status === 'voting' && 'Votez pour votre composition préférée !'}
            {room.status === 'done' && 'Partie enregistrée.'}
          </p>
        </div>

        {/* Room code */}
        <button onClick={copyCode} style={{
          background: 'var(--dark-3)', border: '1px solid var(--gold-dk)',
          borderRadius: 8, padding: '10px 18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', monospace", fontSize: 28,
            fontWeight: 800, letterSpacing: 6, color: 'var(--gold)',
          }}>{code}</span>
          {copied ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} style={{ color: 'var(--text-dim)' }} />}
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: 12 }}>{error}</div>}

      {/* Members */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Joueurs ({room.members.length})
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {room.members.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--dark-3)', borderRadius: 20,
              padding: '5px 12px',
              border: '1px solid var(--gold-dk)',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: m.isGuest ? 'var(--text-dim)' : 'var(--success)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '13px', color: 'var(--text-lt)' }}>
                {m.playerName}
              </span>
              {m.isGuest && <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>guest</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {canJoin && (
            <button className="btn btn-outline" onClick={handleJoin} disabled={joining}>
              {joining ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : null}
              Rejoindre la room
            </button>
          )}
          {isCreator && room.status === 'waiting' && (
            <button className="btn btn-gold" onClick={handleGenerate} disabled={generating}>
              {generating
                ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                : <Zap size={13} />}
              Générer les compositions
            </button>
          )}
        </div>

        {isCreator && room.status === 'waiting' && room.members.length < 5 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input className="input" placeholder="Ajouter un joueur sans compte…" value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddGuest() }}
              style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={handleAddGuest} disabled={addingGuest || !guestName.trim()}>
              {addingGuest
                ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                : <UserPlus size={14} />}
              Ajouter
            </button>
          </div>
        )}
      </div>

      {/* Compositions */}
      {room.compositions && room.compositions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Compositions
          </h4>
          {room.compositions.map((comp, idx) => {
            const votes = tally.get(idx) ?? 0
            const isLeading = votes > 0 && votes === maxTally
            const iMine = myVote?.compositionIndex === idx
            return (
              <CompositionCard
                key={idx}
                comp={comp}
                votes={votes}
                totalVoters={room.members.filter(m => !m.isGuest).length}
                isLeading={isLeading}
                isMine={iMine}
                canVote={room.status === 'voting' && !!user && !!myMember}
                onVote={() => handleVote(idx)}
              />
            )
          })}
        </div>
      )}

      {/* Save as game (creator, voting or done) */}
      {isCreator && room.status === 'voting' && (
        <div className="card" style={{ marginTop: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600 }}>Enregistrer la partie</h4>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { val: true, label: '🏆 Victoire', color: 'var(--success)', bg: 'rgba(39,174,96,0.15)' },
              { val: false, label: '💀 Défaite', color: 'var(--danger)', bg: 'rgba(192,57,43,0.15)' },
            ].map(({ val, label, color, bg }) => (
              <button key={String(val)} onClick={() => setWonChoice(val)} style={{
                flex: 1, minWidth: 120, padding: '8px 16px', borderRadius: 3, cursor: 'pointer',
                border: `1px solid ${wonChoice === val ? color : 'var(--dark-4)'}`,
                background: wonChoice === val ? bg : 'var(--dark-3)',
                color: wonChoice === val ? color : 'var(--text-dim)', fontSize: '13px', fontWeight: 600,
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', color: 'var(--text-dim)' }}>Date</label>
              <input className="input" type="date" value={playedAtChoice}
                onChange={e => setPlayedAtChoice(e.target.value)} style={{ width: 'auto' }} />
            </div>
            <button className="btn btn-gold" onClick={handleSave} disabled={saving || wonChoice === null}>
              {saving ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : <Trophy size={13} />}
              Enregistrer la partie
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function CompositionCard({ comp, votes, totalVoters, isLeading, isMine, canVote, onVote }: {
  comp: Composition
  votes: number
  totalVoters: number
  isLeading: boolean
  isMine: boolean
  canVote: boolean
  onVote: () => void
}) {
  return (
    <div style={{
      background: 'var(--dark-3)',
      border: `1px solid ${isLeading ? 'var(--gold)' : isMine ? 'var(--gold-dk)' : 'var(--dark-4)'}`,
      borderRadius: 10, padding: '14px 16px',
      boxShadow: isLeading ? '0 0 16px rgba(99,102,241,0.15)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-lt)' }}>
            {comp.label}
          </span>
          {isLeading && <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: 'var(--gold)', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>⭐ Favori</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
            {votes}/{totalVoters} vote{votes !== 1 ? 's' : ''}
          </span>
          {canVote && (
            <button onClick={onVote} style={{
              padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              border: `1px solid ${isMine ? 'var(--gold)' : 'var(--dark-4)'}`,
              background: isMine ? 'rgba(99,102,241,0.15)' : 'var(--dark-4)',
              color: isMine ? 'var(--gold)' : 'var(--text)',
            }}>
              {isMine ? '✓ Voté' : 'Voter'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[...comp.assignments].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)).map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--dark-4)', borderRadius: 8, padding: '5px 8px',
          }}>
            {a.imageUrl && (
              <img src={a.imageUrl} alt={a.championName}
                style={{ width: 26, height: 26, borderRadius: 2, objectFit: 'cover' }} />
            )}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-lt)' }}>{a.assignedPlayer ?? '—'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {a.championName} ·
                <span className={`role-badge role-${a.role}`} style={{ fontSize: '10px', padding: '1px 5px' }}>{a.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
