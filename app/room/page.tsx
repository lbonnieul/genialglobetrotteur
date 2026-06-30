'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Users, LogIn } from 'lucide-react'
import type { Region } from '@/lib/types'

export default function NewRoomPage() {
  const { user, fetched } = useAuthStore()
  const router = useRouter()
  const [regions, setRegions] = useState<Region[]>([])
  const [regionId, setRegionId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => { api.regions().then(setRegions) }, [])

  if (fetched && !user) {
    return (
      <main className="main-content" style={{ maxWidth: 500 }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-dim)' }}>Connecte-toi pour créer ou rejoindre une room.</p>
        </div>
      </main>
    )
  }

  const handleJoinByCode = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    router.push(`/room/${code}`)
  }

  const handleCreate = async () => {
    if (!regionId) return setError('Choisis une région.')
    setLoading(true); setError('')
    try {
      const { code } = await api.createRoom({ regionId: Number(regionId) })
      router.push(`/room/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <main className="main-content" style={{ maxWidth: 540 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Users size={20} style={{ color: 'var(--gold)' }} />
        <h2 style={{ margin: 0 }}>Room de draft</h2>
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: 24 }}>
        Crée une room et partage le code, ou rejoins-en une avec un code reçu. Chacun vote pour la compo qui lui convient.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: '13px', fontWeight: 500 }}>
          Rejoindre une room existante
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Code de la room…" value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleJoinByCode() }}
            style={{ textTransform: 'uppercase', letterSpacing: 2, flex: 1 }}
            maxLength={8} />
          <button className="btn btn-outline" onClick={handleJoinByCode} disabled={!joinCode.trim()}>
            <LogIn size={14} /> Rejoindre
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '13px', fontWeight: 500 }}>
            Créer une nouvelle room
          </label>
          <select className="input" value={regionId} onChange={e => setRegionId(Number(e.target.value))}>
            <option value="">Choisir une région…</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
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
