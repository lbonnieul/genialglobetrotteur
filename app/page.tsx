'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Shuffle, LogIn } from 'lucide-react'
import type { Region } from '@/lib/types'

const REGION_COLORS: Record<string, string> = {
  demacia: '#4A7FBF', noxus: '#A82020', freljord: '#4A8FBF',
  ionia: '#7B4FBF', piltover: '#C89A20', zaun: '#2A7F5F',
  bilgewater: '#1A7B8F', 'shadow-isles': '#1A6F4A', targon: '#7F5FBF',
  shurima: '#BF7A1A', ixtal: '#2A8F3A', void: '#6F1A9F', bandlecity: '#BF4F8B',
}

const REGION_SPLASH: Record<string, string> = {
  demacia: 'Garen', noxus: 'Darius', freljord: 'Ashe', ionia: 'Yasuo',
  piltover: 'Jayce', zaun: 'Jinx', bilgewater: 'MissFortune',
  'shadow-isles': 'Thresh', targon: 'Leona', shurima: 'Azir',
  ixtal: 'Qiyana', void: 'Khazix', bandlecity: 'Lulu',
}

function splashUrl(slug: string) {
  const name = REGION_SPLASH[slug]
  return name ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${name}_0.jpg` : null
}

export default function DraftPage() {
  const { user, fetched } = useAuthStore()
  const router = useRouter()
  const [regions, setRegions] = useState<Region[]>([])
  const [spinning, setSpinning] = useState(false)
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { api.regions().then(setRegions) }, [])

  const createRoom = async (region: Region) => {
    if (!user) { setError('Connecte-toi pour créer une room.'); return }
    setCreating(true); setError('')
    try {
      const { code } = await api.createRoom({ regionId: region.id })
      router.push(`/room/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setCreating(false)
    }
  }

  const randomRegion = () => {
    if (!regions.length || spinning || creating) return
    const finalIdx = Math.floor(Math.random() * regions.length)
    const finalRegion = regions[finalIdx]
    const totalSteps = regions.length * 2 + finalIdx + 1
    let step = 0
    setSpinning(true)

    const tick = () => {
      setHighlightedId(regions[step % regions.length].id)
      step++
      if (step >= totalSteps) {
        setTimeout(() => {
          setSpinning(false)
          setHighlightedId(null)
          createRoom(finalRegion)
        }, 500)
        return
      }
      const progress = step / totalSteps
      setTimeout(tick, 60 + progress * progress * 320)
    }
    tick()
  }

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    router.push(`/room/${code}`)
  }

  return (
    <main className="main-content">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Draft Champion Select</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ color: 'var(--text)', fontSize: '14px' }}>
            Choisissez une région pour créer une room de draft, ou rejoignez-en une avec un code.
          </p>
          <button className="btn btn-outline" onClick={randomRegion} disabled={spinning || creating}>
            <Shuffle size={14} style={spinning ? { animation: 'spin 0.5s linear infinite' } : {}} />
            {spinning ? 'Sélection…' : 'Région aléatoire'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: '13px', fontWeight: 500 }}>
          Rejoindre une room existante
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Code de la room…"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
            style={{ textTransform: 'uppercase', letterSpacing: 2, flex: 1 }}
            maxLength={8}
          />
          <button className="btn btn-outline" onClick={handleJoin} disabled={!joinCode.trim()}>
            <LogIn size={14} /> Rejoindre
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: 16 }}>{error}</div>
      )}

      {fetched && !user && (
        <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: 16 }}>
          <a href="/auth" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Connecte-toi</a> pour créer une room en cliquant sur une région.
        </div>
      )}

      {creating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--text-dim)', fontSize: '13px' }}>
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          Création de la room…
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {regions.map(r => (
          <RegionCard
            key={r.id}
            region={r}
            onClick={() => !spinning && !creating && createRoom(r)}
            highlighted={highlightedId === r.id}
            dimmed={(spinning || creating) && highlightedId !== r.id}
          />
        ))}
      </div>
    </main>
  )
}

function RegionCard({ region, onClick, highlighted, dimmed }: {
  region: Region; onClick: () => void; highlighted: boolean; dimmed: boolean
}) {
  const accent = REGION_COLORS[region.slug] ?? '#4A6FBF'
  const splash = splashUrl(region.slug)

  return (
    <button onClick={onClick} style={{
      position: 'relative', background: 'var(--dark-3)',
      border: highlighted ? `2px solid ${accent}` : '1px solid var(--border)',
      borderRadius: '12px', padding: 0, cursor: 'pointer',
      overflow: 'hidden', aspectRatio: '16/9',
      transition: 'transform 0.12s, box-shadow 0.12s, border-color 0.12s, opacity 0.12s',
      textAlign: 'left',
      transform: highlighted ? 'scale(1.03)' : 'none',
      boxShadow: highlighted ? `0 0 28px ${accent}88, 0 0 8px ${accent}44` : 'none',
      opacity: dimmed ? 0.35 : 1,
    }}
      onMouseEnter={e => {
        if (highlighted || dimmed) return
        const el = e.currentTarget as HTMLButtonElement
        el.style.transform = 'translateY(-3px) scale(1.01)'
        el.style.boxShadow = `0 12px 32px ${accent}44`
        el.style.borderColor = `${accent}88`
      }}
      onMouseLeave={e => {
        if (highlighted || dimmed) return
        const el = e.currentTarget as HTMLButtonElement
        el.style.transform = 'none'
        el.style.boxShadow = 'none'
        el.style.borderColor = 'var(--border)'
      }}
    >
      {splash && (
        <img src={splash} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center top', opacity: 0.35,
        }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${accent}22 0%, transparent 60%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,8,14,0.92) 0%, rgba(7,8,14,0.3) 50%, transparent 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '15px', fontWeight: 700, color: 'var(--text-lt)', marginBottom: '3px', letterSpacing: '-0.01em' }}>
          {region.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.4 }}>{region.description}</div>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${accent}, transparent)`, opacity: 0.7 }} />
    </button>
  )
}
