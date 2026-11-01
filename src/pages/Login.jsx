import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui'
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
    <div className="min-h-dvh grid place-items-center bg-bg px-6 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-[380px] bg-card rounded-card p-8">
        <div className="text-center mb-7">
          {/* The app mark, not a padlock: this is a personal tracker, not
              a security product. Phase 7 ships the same V as the PWA icon. */}
          <span
            className="inline-grid place-items-center w-14 h-14 rounded-[18px] bg-accent text-white text-[26px] font-bold"
            aria-hidden="true"
          >
            V
          </span>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-fg mt-3.5">Vita</h1>
          <p className="text-[13px] text-muted mt-1.5">Sign in to your tracker</p>
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

        <Button full type="submit" disabled={submitting} className="mt-2">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-center text-[11px] text-muted mt-5">
          Private tracker · accounts by invitation only
        </p>
      </form>
    </div>
  )
}
