'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PlayerInput } from '@/components/PlayerInput'
import { Plus, Trash2, Users } from 'lucide-react'
import type { Region } from '@/lib/types'

interface KnownPlayer { id: number | null; name: string }
interface Member { name: string; userId: number | null }

export default function NewRoomPage() {
  const { user, fetched } = useAuthStore()
  const router = useRouter()
  const [regions, setRegions] = useState<Region[]>([])
  const [regionId, setRegionId] = useState<number | ''>('')
  const [members, setMembers] = useState<Member[]>([{ name: '', userId: null }])
  const [knownPlayers, setKnownPlayers] = useState<KnownPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.regions().then(setRegions)
    api.players().then(setKnownPlayers)
  }, [])

  // Pre-fill creator as first member
  useEffect(() => {
    if (user) setMembers([{ name: user.username, userId: user.id }])
  }, [user])

  if (fetched && !user) {
    return (
      <main className="main-content" style={{ maxWidth: 500 }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-dim)' }}>Connecte-toi pour créer une room.</p>
        </div>
      </main>
    )
  }

  const addMember = () => {
    if (members.length >= 5) return
    setMembers(m => [...m, { name: '', userId: null }])
  }

  const removeMember = (i: number) => setMembers(m => m.filter((_, idx) => idx !== i))

  const updateMember = (i: number, name: string, userId: number | null) =>
    setMembers(m => m.map((mb, idx) => idx !== i ? mb : { name, userId }))

  const suggestionsFor = (i: number) =>
    knownPlayers.filter(p => !members.some((mb, idx) => idx !== i && mb.name.toLowerCase() === p.name.toLowerCase()))

  const handleCreate = async () => {
    if (!regionId) return setError('Choisis une région.')
    const valid = members.every(m => m.name.trim())
    if (!valid) return setError('Remplis tous les noms de joueurs.')
    setLoading(true); setError('')
    try {
      const { code } = await api.createRoom({ regionId: Number(regionId), members })
      router.push(`/room/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <main className="main-content" style={{ maxWidth: 540 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Users size={20} style={{ color: 'var(--gold)' }} />
        <h2 style={{ margin: 0 }}>Nouvelle room de draft</h2>
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: 24 }}>
        Crée une room, partage le code à tes coéquipiers. Chacun vote pour la compo qui lui convient.
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '13px', fontWeight: 500 }}>Région</label>
          <select className="input" value={regionId} onChange={e => setRegionId(Number(e.target.value))}>
            <option value="">Choisir une région…</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: '13px', fontWeight: 500 }}>
            Joueurs ({members.length}/5)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <PlayerInput
                    value={m.name}
                    onChange={(name, userId) => updateMember(i, name, userId)}
                    players={suggestionsFor(i)}
                  />
                </div>
                {i === 0
                  ? <div style={{ width: 28 }} />
                  : <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => removeMember(i)}>
                    <Trash2 size={14} />
                  </button>
                }
              </div>
            ))}
          </div>
          {members.length < 5 && (
            <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: '12px' }} onClick={addMember}>
              <Plus size={13} /> Ajouter un joueur
            </button>
          )}
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</div>}

        <button className="btn btn-gold" onClick={handleCreate} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Users size={14} />}
          Créer la room
        </button>
      </div>
    </main>
  )
}
