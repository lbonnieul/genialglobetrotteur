'use client'
import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { ChampionCard } from '@/components/ChampionCard'
import { Search } from 'lucide-react'
import type { Champion } from '@/lib/types'

const ROLES = ['top', 'jungle', 'mid', 'bot', 'support']

export default function ChampionsPage() {
  const [champions, setChampions] = useState<Champion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<number | 'all'>('all')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    api.champions().then(data => { setChampions(data); setLoading(false) })
  }, [])

  const allRegions = useMemo(() => {
    const map = new Map<number, { id: number; slug: string; name: string }>()
    for (const c of champions) {
      for (const r of c.regions) {
        if (!map.has(r.id)) map.set(r.id, r)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [champions])

  const filtered = useMemo(() => champions.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (regionFilter !== 'all' && !c.regions.some(r => r.id === regionFilter)) return false
    if (roleFilter !== 'all' && !c.roles.some(r => r.role === roleFilter)) return false
    return true
  }), [champions, search, regionFilter, roleFilter])

  return (
    <main className="main-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '28px', marginBottom: 8 }}>Champions</h1>
        <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: 20 }}>
          Retrouvez tous les champions et gérez vos préférences par rôle.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
            <Search size={13} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-dim)', pointerEvents: 'none',
            }} />
            <input
              className="input"
              placeholder="Rechercher un champion…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>

          <select
            className="input"
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{ flex: '0 0 auto', width: 'auto', minWidth: 150 }}
          >
            <option value="all">Toutes les régions</option>
            {allRegions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <FilterBtn label="Tous" active={roleFilter === 'all'} color="var(--text-lt)" onClick={() => setRoleFilter('all')} />
            {ROLES.map(r => (
              <FilterBtn key={r} label={r} active={roleFilter === r} color={`var(--${r})`} onClick={() => setRoleFilter(r)} />
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: 14 }}>
            {filtered.length} champion{filtered.length !== 1 ? 's' : ''}
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
              Aucun champion trouvé.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
              {filtered.map(c => <ChampionCard key={c.id} champion={c} />)}
            </div>
          )}
        </>
      )}
    </main>
  )
}

function FilterBtn({ label, active, color, onClick }: {
  label: string; active: boolean; color: string; onClick: () => void
}) {
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
