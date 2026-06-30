'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { Search, Save, ChevronDown } from 'lucide-react'
import type { Champion, Region } from '@/lib/types'

const ROLES = ['top', 'jungle', 'mid', 'bot', 'support']
const ROLE_ICONS: Record<string, string> = { top: '🛡️', jungle: '🌲', mid: '⚡', bot: '🏹', support: '💠' }

interface ChampEdit { roles: string[]; regionIds: number[] }

export default function AdminPage() {
  const { user, fetched } = useAuthStore()
  const router = useRouter()
  const [champs, setChamps] = useState<Champion[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [edits, setEdits] = useState<Record<string, ChampEdit>>({})

  useEffect(() => {
    if (fetched && !user?.isAdmin) router.push('/')
  }, [fetched, user, router])

  useEffect(() => {
    Promise.all([api.champions(), api.regions()]).then(([c, r]) => {
      setChamps(c); setRegions(r); setLoading(false)
    })
  }, [])

  const getEdit = (riotId: string): ChampEdit => {
    if (edits[riotId]) return edits[riotId]
    const c = champs.find(x => x.riotId === riotId)
    return { roles: c?.roles?.map(r => r.role) ?? [], regionIds: c?.regions?.map(r => r.id) ?? [] }
  }

  const toggleRole = (riotId: string, role: string) => {
    const current = getEdit(riotId)
    const roles = current.roles.includes(role) ? current.roles.filter(r => r !== role) : [...current.roles, role]
    setEdits(e => ({ ...e, [riotId]: { ...current, roles } }))
  }

  const save = async (c: Champion) => {
    const edit = getEdit(c.riotId)
    setSaving(s => ({ ...s, [c.riotId]: true }))
    try {
      const updated = await api.updateChampion(c.riotId, { roles: edit.roles, regionIds: edit.regionIds })
      setChamps(cs => cs.map(x => x.riotId === c.riotId ? updated : x))
      setEdits(e => { const n = { ...e }; delete n[c.riotId]; return n })
    } finally {
      setSaving(s => ({ ...s, [c.riotId]: false }))
    }
  }

  const filtered = champs.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRegion === 'none' && (c.regions?.length ?? 0) > 0) return false
    if (filterRegion !== 'all' && filterRegion !== 'none') {
      if (!c.regions?.some(r => String(r.id) === filterRegion)) return false
    }
    return true
  })

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><div className="spinner" /></div>

  return (
    <main className="main-content">
      <h2 style={{ marginBottom: '4px' }}>Administration des Champions</h2>
      <p style={{ color: 'var(--text)', fontSize: '13px', marginBottom: '24px' }}>
        Assignez les régions et ajustez les rôles de chaque champion.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="input" style={{ paddingLeft: '32px' }} placeholder="Rechercher un champion…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: '200px' }} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
          <option value="all">Toutes les régions</option>
          <option value="none">Sans région</option>
          {regions.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
        </select>
      </div>

      <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '12px' }}>
        {filtered.length} champion{filtered.length > 1 ? 's' : ''} · {champs.filter(c => !c.regions?.length).length} sans région
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(c => {
          const edit = getEdit(c.riotId)
          const dirty = !!edits[c.riotId]
          return (
            <div key={c.riotId} style={{
              display: 'grid',
              gridTemplateColumns: '48px 160px 1fr auto auto',
              gap: '12px', alignItems: 'center',
              background: dirty ? 'rgba(99,102,241,0.06)' : 'var(--dark-3)',
              border: `1px solid ${dirty ? 'var(--gold-dk)' : 'var(--border)'}`,
              borderRadius: '10px', padding: '10px 12px',
            }}>
              {c.imageUrl && (
                <img src={c.imageUrl} alt={c.name} style={{ width: 48, height: 48, borderRadius: '6px', objectFit: 'cover' }} />
              )}
              {!c.imageUrl && <div style={{ width: 48, height: 48, background: 'var(--dark-4)', borderRadius: '6px' }} />}
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', color: 'var(--text-lt)', fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: 2 }}>{c.title}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ROLES.map(role => {
                  const active = edit.roles.includes(role)
                  return (
                    <button key={role} onClick={() => toggleRole(c.riotId, role)}
                      className={`role-badge role-${role}`}
                      style={{ opacity: active ? 1 : 0.2, cursor: 'pointer', border: active ? undefined : '1px dashed' }}>
                      {ROLE_ICONS[role]} {role}
                    </button>
                  )
                })}
              </div>
              <RegionMultiSelect
                value={edit.regionIds} regions={regions}
                onChange={(ids) => setEdits(e => ({ ...e, [c.riotId]: { ...edit, regionIds: ids } }))}
              />
              <button className="btn btn-gold" style={{ padding: '6px 14px', fontSize: '12px', opacity: dirty ? 1 : 0.35 }}
                disabled={!dirty || saving[c.riotId]} onClick={() => save(c)}>
                {saving[c.riotId]
                  ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  : <><Save size={12} /> Sauver</>}
              </button>
            </div>
          )
        })}
      </div>
    </main>
  )
}

function RegionMultiSelect({ value, regions, onChange }: {
  value: number[]; regions: Region[]; onChange: (ids: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: number) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  const selected = regions.filter(r => value.includes(r.id))

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: '170px' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '6px 10px',
        background: 'var(--dark-2)', border: '1px solid var(--border)',
        borderRadius: '8px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
        color: selected.length ? 'var(--text-lt)' : 'var(--text-dim)',
        fontSize: '13px', fontFamily: "'Inter',sans-serif",
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.length === 0 ? '— Aucune région —' : selected.length === 1 ? selected[0].name : `${selected.length} régions`}
        </span>
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'var(--text-dim)' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: 'var(--dark-3)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '6px',
          minWidth: '200px', maxHeight: '260px', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {regions.map(r => {
            const checked = value.includes(r.id)
            return (
              <label key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', borderRadius: '6px', cursor: 'pointer',
                background: checked ? 'rgba(99,102,241,0.1)' : 'transparent',
                color: checked ? 'var(--gold-lt)' : 'var(--text)', fontSize: '13px',
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(r.id)}
                  style={{ accentColor: 'var(--gold)', width: 14, height: 14 }} />
                {r.name}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
