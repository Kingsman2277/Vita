import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setSubmitting(true)
    try {
      await signIn({ username, password })
      // Auth state change fires via onAuthStateChange in useAuth; the root
      // router will swap to the app shell automatically.
    } catch (err) {
      const msg = err?.message || 'Sign in failed'
      toast.error(
        msg.toLowerCase().includes('invalid') ? 'Wrong username or password' : msg
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      style={{ padding: 24, background: 'var(--background)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="hero-card"
        style={{ width: '100%', maxWidth: 380, padding: 32 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 36, lineHeight: 1 }} aria-hidden="true">🔒</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 12 }}>
            Vita
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 6 }}>
            Sign in to your tracker
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="form-input"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
          style={{ padding: '12px 24px', marginTop: 8, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-muted-foreground text-center" style={{ fontSize: 11, marginTop: 18 }}>
          Private tracker · accounts by invitation only
        </p>
      </form>
    </div>
  )
}
