'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Shield, LogOut, User, Sword } from 'lucide-react'
import { useEffect } from 'react'

export function Navbar() {
  const { user, fetched, fetchMe, logout } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => { if (!fetched) fetchMe() }, [fetched, fetchMe])

  const handleLogout = async () => { await logout(); router.push('/') }

  return (
    <nav style={{
      background: 'rgba(7,8,14,0.80)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: '8px',
      height: '56px', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        color: 'var(--gold)', fontSize: '16px', fontWeight: 700,
        letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        marginRight: '12px', display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <Sword size={16} strokeWidth={2.5} />
        Globe-Trotter
      </div>

      <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
        <TabLink href="/" label="Régions" active={pathname === '/'} />
        <TabLink href="/history" label="Historique" active={pathname === '/history'} />
        {user?.isAdmin && (
          <TabLink href="/admin" label="Admin" active={pathname === '/admin'} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user ? (
          <>
            <Link href="/auth" style={{
              textDecoration: 'none', color: 'var(--text)', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid var(--border)', transition: 'all 0.15s',
            }}>
              <User size={13} />
              {user.username}
              {user.isAdmin && <Shield size={12} style={{ color: 'var(--gold)' }} />}
            </Link>
            <button className="btn btn-ghost" style={{ padding: '6px 8px', borderRadius: '8px' }}
              onClick={handleLogout} title="Déconnexion">
              <LogOut size={15} />
            </button>
          </>
        ) : (
          <Link href="/auth" className="btn btn-outline" style={{ fontSize: '13px', padding: '7px 16px' }}>
            Connexion
          </Link>
        )}
      </div>
    </nav>
  )
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
      color: active ? 'var(--gold)' : 'var(--text)',
      border: 'none', borderRadius: '8px',
      padding: '6px 14px', fontSize: '13px',
      fontWeight: active ? 600 : 400, cursor: 'pointer',
      transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
      textDecoration: 'none', display: 'inline-block',
    }}>
      {label}
    </Link>
  )
}
