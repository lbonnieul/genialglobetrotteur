'use client'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import type { Champion } from '@/lib/types'

const ROLE_ORDER = ['top', 'jungle', 'mid', 'bot', 'support']

export function ChampionCard({ champion }: { champion: Champion }) {
  const { user, getPreference, setPreferenceLocal } = useAuthStore()
  const roles = [...(champion.roles ?? [])].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  )

  const handlePref = async (role: string, liked: boolean) => {
    if (!user) return
    const current = getPreference(champion.riotId, role)
    if (current === liked) {
      await api.setPreference(champion.riotId, role, null)
      setPreferenceLocal(champion.riotId, role, null)
    } else {
      await api.setPreference(champion.riotId, role, liked)
      setPreferenceLocal(champion.riotId, role, liked)
    }
  }

  return (
    <div
      style={{
        background: 'var(--dark-3)', border: '1px solid var(--border)',
        borderRadius: '10px', overflow: 'hidden',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border-2)'
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      <div style={{ position: 'relative' }}>
        {champion.imageUrl && (
          <img src={champion.imageUrl} alt={champion.name}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(7,8,14,0.9))',
          padding: '20px 8px 6px',
        }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', color: 'var(--text-lt)', fontWeight: 700 }}>
            {champion.name}
          </div>
        </div>
      </div>

      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {roles.map(({ role }) => {
          const pref = user ? getPreference(champion.riotId, role) : null
          return (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className={`role-badge role-${role}`} style={{ flex: 1 }}>
                {role}
              </span>
              {user && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <PrefBtn active={pref === true} color="var(--success)" onClick={() => handlePref(role, true)} title="Je peux jouer">
                    <ThumbsUp size={11} />
                  </PrefBtn>
                  <PrefBtn active={pref === false} color="var(--danger)" onClick={() => handlePref(role, false)} title="Je ne veux pas jouer">
                    <ThumbsDown size={11} />
                  </PrefBtn>
                </div>
              )}
            </div>
          )
        })}
        {roles.length === 0 && (
          <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Aucun rôle</span>
        )}
      </div>
    </div>
  )
}

function PrefBtn({ active, color, onClick, title, children }: {
  active: boolean; color: string; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 22, height: 22,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '5px', cursor: 'pointer',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      background: active ? `${color}20` : 'transparent',
      color: active ? color : 'var(--text-dim)',
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  )
}
