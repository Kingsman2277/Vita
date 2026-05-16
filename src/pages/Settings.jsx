import { useState } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { username, user, signOut, updateUsername, updatePassword } = useAuth()
  const [usernameForm, setUsernameForm] = useState(username || '')
  const [savingUsername, setSavingUsername] = useState(false)
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleUsername = async (e) => {
    e.preventDefault()
    const clean = usernameForm.trim().toLowerCase()
    if (!clean) return
    if (clean === username) {
      toast('No change to save')
      return
    }
    setSavingUsername(true)
    try {
      await updateUsername(clean)
      toast.success(`Username changed to ${clean}`)
    } catch (err) {
      const msg = err?.message || 'Could not save username'
      toast.error(/already.*registered|exists|taken/i.test(msg) ? 'That username is already taken' : msg)
    }
    setSavingUsername(false)
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (!pwForm.next || !pwForm.confirm) return
    if (pwForm.next !== pwForm.confirm) {
      toast.error("Passwords don't match")
      return
    }
    setSavingPw(true)
    try {
      await updatePassword(pwForm.next)
      toast.success('Password updated')
      setPwForm({ next: '', confirm: '' })
    } catch (err) {
      toast.error(err?.message || 'Could not update password')
    }
    setSavingPw(false)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try { await signOut() }
    catch { toast.error('Sign out failed'); setSigningOut(false) }
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Settings</h1>
        <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 4 }}>
          Manage your account
        </p>
      </header>

      {/* Account info */}
      <Card style={{ padding: 20 }}>
        <p className="stat-label" style={{ marginBottom: 14 }}>Account</p>
        <div className="flex flex-col" style={{ gap: 12 }}>
          <Row label="Signed in as" value={username || '—'} />
          {createdAt && <Row label="Account created" value={createdAt} />}
          <Row label="Internal email" value={user?.email || '—'} small />
        </div>
      </Card>

      {/* Change username */}
      <Card style={{ padding: 20 }}>
        <p className="stat-label" style={{ marginBottom: 14 }}>Change Username</p>
        <form onSubmit={handleUsername}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">New username</label>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={usernameForm}
              onChange={e => setUsernameForm(e.target.value)}
              className="form-input"
              placeholder="e.g. matteo"
              required
            />
            <p className="text-hint">2-32 characters · lowercase letters, digits, or underscores</p>
          </div>
          <button
            type="submit"
            disabled={savingUsername || !usernameForm.trim() || usernameForm.trim().toLowerCase() === username}
            className="btn-primary w-full"
            style={{ padding: '12px 24px', opacity: (savingUsername || usernameForm.trim().toLowerCase() === username) ? 0.5 : 1 }}
          >
            {savingUsername ? 'Saving…' : 'Update username'}
          </button>
        </form>
      </Card>

      {/* Change password */}
      <Card style={{ padding: 20 }}>
        <p className="stat-label" style={{ marginBottom: 14 }}>Change Password</p>
        <form onSubmit={handlePassword}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={pwForm.next}
              onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
              className="form-input"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Confirm new password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className="form-input"
              placeholder="Re-type the password"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={savingPw || !pwForm.next || pwForm.next !== pwForm.confirm}
            className="btn-primary w-full"
            style={{ padding: '12px 24px', opacity: (savingPw || !pwForm.next || pwForm.next !== pwForm.confirm) ? 0.5 : 1 }}
          >
            {savingPw ? 'Saving…' : 'Update password'}
          </button>
          <p className="text-hint" style={{ marginTop: 10 }}>
            You'll stay signed in on this device. Other sessions will need the new password.
          </p>
        </form>
      </Card>

      {/* Sign out */}
      <Card style={{ padding: 20 }}>
        <p className="stat-label" style={{ marginBottom: 14 }}>Session</p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="btn-secondary w-full"
          style={{ padding: '12px 24px', color: 'var(--danger)', borderColor: 'var(--danger)', opacity: signingOut ? 0.5 : 1 }}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </Card>

      <p className="text-muted-foreground text-center" style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
        Vita · v1.0
      </p>
    </div>
  )
}

function Row({ label, value, small }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: 12 }}>
      <span className="text-muted-foreground" style={{ fontSize: 13 }}>{label}</span>
      <span
        className="text-foreground"
        style={{
          fontSize: small ? 12 : 14,
          fontWeight: small ? 400 : 600,
          opacity: small ? 0.7 : 1,
          fontFamily: small ? 'monospace' : 'inherit',
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  )
}
