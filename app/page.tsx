'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { ChampionCard } from '@/components/ChampionCard'
import { TeamBuilder } from '@/components/TeamBuilder'
import { RecordGame } from '@/components/RecordGame'
import { Shuffle, ChevronLeft, Users, BookOpen } from 'lucide-react'
import type { Region, RegionDetail } from '@/lib/types'

const ROLES = ['top', 'jungle', 'mid', 'bot', 'support']
const ROLE_ICONS: Record<string, string> = { top: '🛡️', jungle: '🌲', mid: '⚡', bot: '🏹', support: '💠' }

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

export default function ExplorerPage() {
  const { user } = useAuthStore()
  const [regions, setRegions] = useState<Region[]>([])
  const [selected, setSelected] = useState<Region | null>(null)
  const [detail, setDetail] = useState<RegionDetail | null>(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [panel, setPanel] = useState<'team' | 'record' | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [highlightedId, setHighlightedId] = useState<number | null>(null)

  useEffect(() => { api.regions().then(setRegions) }, [])

  const selectRegion = async (region: Region) => {
    setSelected(region)
    setLoading(true)
    setRoleFilter('all')
    setPanel(null)
    try {
      setDetail(await api.region(region.slug))
    } finally { setLoading(false) }
  }

  const randomRegion = () => {
    if (!regions.length || spinning) return
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
          selectRegion(finalRegion)
        }, 500)
        return
      }
      const progress = step / totalSteps
      setTimeout(tick, 60 + progress * progress * 320)
    }
    tick()
  }

  const filteredChampions = detail?.champions?.filter(c =>
    roleFilter === 'all' || c.roles?.some(r => r.role === roleFilter)
  ) ?? []

  if (!selected) {
    return (
      <main className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Choisissez une Région</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: 'var(--text)', fontSize: '14px' }}>
              Sélectionnez une région de Runeterra pour le défi Globe-Trotter
            </p>
            <button className="btn btn-outline" onClick={randomRegion} disabled={spinning}>
              <Shuffle size={14} style={spinning ? { animation: 'spin 0.5s linear infinite' } : {}} />
              {spinning ? 'Sélection…' : 'Région aléatoire'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {regions.map(r => (
            <RegionCard
              key={r.id} region={r}
              onClick={() => !spinning && selectRegion(r)}
              highlighted={highlightedId === r.id}
              dimmed={spinning && highlightedId !== r.id}
            />
          ))}
        </div>
      </main>
    )
  }

  const accent = REGION_COLORS[selected.slug] ?? 'var(--gold)'

  return (
    <main className="main-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => { setSelected(null); setDetail(null) }} style={{ padding: '6px 10px' }}>
          <ChevronLeft size={16} /> Retour
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '22px', marginBottom: '2px' }}>{selected.name}</h2>
          <p style={{ color: 'var(--text)', fontSize: '13px' }}>{selected.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => {
            if (!regions.length) return
            const others = regions.filter(r => r.id !== selected.id)
            selectRegion(others[Math.floor(Math.random() * others.length)])
          }}>
            <Shuffle size={13} /> Autre région
          </button>
          {detail && user && (
            <button className="btn btn-outline"
              style={panel === 'record' ? { borderColor: 'var(--success)', color: 'var(--success)' } : {}}
              onClick={() => setPanel(p => p === 'record' ? null : 'record')}>
              <BookOpen size={13} /> Enregistrer une partie
            </button>
          )}
          {detail && (
            <button className="btn btn-gold" onClick={() => setPanel(p => p === 'team' ? null : 'team')}>
              <Users size={14} /> {panel === 'team' ? 'Cacher équipe' : 'Monter une équipe'}
            </button>
          )}
        </div>
      </div>

      {panel === 'team' && detail && (
        <div style={{ marginBottom: '20px' }}>
          <TeamBuilder regionSlug={selected.slug} regionName={selected.name} />
        </div>
      )}
      {panel === 'record' && detail && (
        <div style={{ marginBottom: '20px' }}>
          <RecordGame
            regionId={detail.id} regionName={detail.name}
            champions={detail.champions}
            onClose={() => setPanel(null)} onSaved={() => setPanel(null)}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <FilterBtn label="Tous" active={roleFilter === 'all'} color="var(--text-lt)" onClick={() => setRoleFilter('all')} />
        {ROLES.map(r => (
          <FilterBtn key={r} label={`${ROLE_ICONS[r]} ${r}`} active={roleFilter === r} color={`var(--${r})`} onClick={() => setRoleFilter(r)} />
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" />
        </div>
      ) : filteredChampions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          {detail?.champions?.length === 0
            ? "Aucun champion assigné à cette région. Rendez-vous dans l'onglet Admin."
            : `Aucun champion ${roleFilter} dans cette région.`}
        </div>
      ) : (
        <>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '14px' }}>
            {filteredChampions.length} champion{filteredChampions.length > 1 ? 's' : ''}
            {user && <span style={{ marginLeft: 8 }}>· Indique tes préférences par rôle</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '10px' }}>
            {filteredChampions.map(c => <ChampionCard key={c.id} champion={c} />)}
          </div>
        </>
      )}
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

function FilterBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      background: active ? `${color}18` : 'transparent',
      color: active ? color : 'var(--text)',
      fontSize: '12px', fontWeight: active ? 600 : 400,
      textTransform: 'capitalize', transition: 'all 0.15s',
      fontFamily: "'Inter', sans-serif",
    }}>
      {label}
    </button>
  )
}
