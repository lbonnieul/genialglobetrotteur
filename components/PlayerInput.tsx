'use client'
import { useState, useRef, useEffect } from 'react'

interface KnownPlayer { id: number | null; name: string }

interface Props {
  value: string
  onChange: (name: string, userId: number | null) => void
  players: KnownPlayer[]
  placeholder?: string
  style?: React.CSSProperties
}

export function PlayerInput({ value, onChange, players, placeholder = 'Pseudo joueur', style }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? players.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
    : players

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (p: KnownPlayer) => {
    onChange(p.name, p.id)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <input
        className="input"
        style={{ fontSize: '13px', width: '100%' }}
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value, null); setOpen(true) }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'var(--dark-3)', border: '1px solid var(--border)',
          borderRadius: '8px', overflow: 'hidden',
          maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {filtered.map((p, i) => (
            <button key={i} type="button" onMouseDown={() => select(p)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '8px 12px', background: 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              color: p.id ? 'var(--text-lt)' : 'var(--text)',
              fontSize: '13px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--dark-4)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: p.id ? 'var(--gold)' : 'var(--border-2)',
              }} />
              {p.name}
              {p.id && <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)' }}>compte</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
