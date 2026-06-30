'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { LogIn, UserPlus, Pencil, Check } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const { user, setUser, fetchMe } = useAuthStore()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ username: '', password: '' })
  const [newUsername, setNewUsername] = useState('')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const setField = (k: 'username' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (tab === 'register') await api.register(form.username, form.password)
      else await api.login(form.username, form.password)
      await fetchMe()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally { setLoading(false) }
  }

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim() || newUsername.trim() === user?.username) { setEditing(false); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const updated = await api.updateUsername(newUsername.trim())
      setUser(updated)
      setSuccess('Pseudo mis à jour !')
      setEditing(false); setNewUsername('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de modifier')
    } finally { setLoading(false) }
  }

  return (
    <main style={{ maxWidth: '420px', margin: '60px auto', padding: '0 16px' }}>
      {!user ? (
        <>
          <div style={{ display: 'flex', gap: '2px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '10px', cursor: 'pointer', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                color: tab === t ? 'var(--gold)' : 'var(--text-dim)',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 600,
              }}>
                {t === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>
          <form onSubmit={handleAuth}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Pseudo" value={form.username} onChange={setField('username')} placeholder="MonPseudo" autoFocus />
              <Field label="Mot de passe" type="password" value={form.password} onChange={setField('password')} placeholder="••••••••" />
              {error && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</div>}
              <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {tab === 'login' ? <><LogIn size={14} /> Connexion</> : <><UserPlus size={14} /> Créer mon compte</>}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="card">
          {editing ? (
            <form onSubmit={handleUpdateUsername}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Field label="Nouveau pseudo" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder={user.username} autoFocus />
                {error && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-gold" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                    <Check size={14} /> Enregistrer
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setError('') }}>
                    Annuler
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', flex: 1 }}>{user.username}</h2>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => { setNewUsername(user.username); setEditing(true); setError(''); setSuccess('') }}>
                <Pencil size={13} /> Modifier
              </button>
            </div>
          )}
          {success && <div style={{ color: 'var(--success)', fontSize: '13px', marginTop: '12px' }}>{success}</div>}
        </div>
      )}
    </main>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, autoFocus }: {
  label: string; type?: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; autoFocus?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label>{label}</label>
      <input className="input" type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} />
    </div>
  )
}
