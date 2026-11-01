import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AppHeader, BottomSheet, Button, Card } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useIsAdmin } from '../hooks/useAdmin'

export default function Settings() {
  const navigate = useNavigate()
  const { username, user, signOut, updateUsername, updatePassword, verifyPassword } = useAuth()
  const { isAdmin } = useIsAdmin()
  const [usernameForm, setUsernameForm] = useState(username || '')
  const [savingUsername, setSavingUsername] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [usernameSheet, setUsernameSheet] = useState(false)
  const [passwordSheet, setPasswordSheet] = useState(false)

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
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toast.error('Fill in all password fields')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error("New passwords don't match")
      return
    }
    if (pwForm.next === pwForm.current) {
      toast.error('New password must be different from current')
      return
    }
    setSavingPw(true)
    try {
      // Re-auth check first — fails fast with a clear error if the
      // current password is wrong, before we touch the auth user.
      await verifyPassword(pwForm.current)
      await updatePassword(pwForm.next)
      toast.success('Password updated')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err?.message || 'Could not update password')
    }
    setSavingPw(false)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try { await signOut() }
    catch (err) {
      console.error('signOut error:', err)
      toast.error(err?.message || 'Sign out failed')
      setSigningOut(false)
    }
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const pwInvalid = savingPw || !pwForm.current || !pwForm.next || pwForm.next !== pwForm.confirm

  return (
    <div
      className="mx-auto w-full max-w-[640px] px-4 pb-6 flex flex-col gap-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <AppHeader title="Me" avatarInitial={username?.charAt(0) || '?'} caption="Your account" />

      {/* Account */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3.5">Account</p>
        <div className="flex flex-col gap-3">
          <Row label="Signed in as" value={username || '—'} />
          {createdAt && <Row label="Account created" value={createdAt} />}
          <Row label="Internal email" value={user?.email || '—'} small />
        </div>
      </Card>

      {/* Actions — one grouped list rather than four stacked cards. */}
      <Card padding="sm">
        <ActionRow title="Change username" desc="2-32 characters · lowercase, digits, underscores" onClick={() => { setUsernameForm(username || ''); setUsernameSheet(true) }} />
        <ActionRow title="Change password" desc="Verified with your current password" onClick={() => setPasswordSheet(true) } />
        <ActionRow title="Monthly summary & export" desc="Totals for the month, and CSV export" onClick={() => navigate('/money/insights')} />
        {isAdmin && (
          <ActionRow title="Admin" desc="Manage users, features and activity" onClick={() => navigate('/admin')} />
        )}
      </Card>

      {/* Sign out reads as destructive text, not a filled button. */}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full min-h-[44px] text-[15px] font-semibold text-danger disabled:opacity-50"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      <p className="text-center text-[11px] text-muted">
        {username ? `${username} · ` : ''}Vita v1.0
      </p>

      {/* ─── Sheets ─── */}
      <BottomSheet open={usernameSheet} onClose={() => setUsernameSheet(false)} title="Change username">
        <form onSubmit={async e => { await handleUsername(e); setUsernameSheet(false) }}>
          <div className="form-group">
            <label className="form-label">New username</label>
            <input
              value={usernameForm}
              onChange={e => setUsernameForm(e.target.value)}
              className="form-input"
              placeholder="e.g. matteo"
              autoComplete="username"
              minLength={2}
              maxLength={32}
              required
            />
          </div>
          <Button full type="submit" disabled={savingUsername}>
            {savingUsername ? 'Saving…' : 'Update username'}
          </Button>
        </form>
      </BottomSheet>

      <BottomSheet open={passwordSheet} onClose={() => setPasswordSheet(false)} title="Change password">
        <form onSubmit={async e => { await handlePassword(e); setPasswordSheet(false) }}>
          <div className="form-group">
            <label className="form-label">Current password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
              className="form-input"
              placeholder="Verify it's you"
              required
            />
          </div>
          <div className="form-group">
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
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className="form-input"
              placeholder="Re-type the new password"
              minLength={8}
              required
            />
          </div>
          <Button full type="submit" disabled={pwInvalid}>
            {savingPw ? 'Verifying & saving…' : 'Update password'}
          </Button>
          <p className="text-xs text-muted mt-3">
            Your current password is verified first. You'll stay signed in on this device; other sessions will need the new password.
          </p>
        </form>
      </BottomSheet>
    </div>
  )
}

function ActionRow({ title, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 text-left border-b border-divider last:border-b-0"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-fg">{title}</span>
        {desc && <span className="block text-xs text-muted mt-0.5">{desc}</span>}
      </span>
      <svg className="w-4 h-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  )
}

function Row({ label, value, small }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: 12 }}>
      <span className="text-[13px] text-muted">{label}</span>
      <span
        className="text-fg"
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
