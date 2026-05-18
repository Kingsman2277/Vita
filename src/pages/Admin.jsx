import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import SkeletonLoader from '../components/SkeletonLoader'
import {
  useIsAdmin, useAdminUsers, useAdminUserRecent,
  adminResetPassword, fetchUserFeatures, adminSetUserFeatures,
} from '../hooks/useAdmin'
import { emailToUsername } from '../lib/supabase'
import { FEATURE_CATALOG } from '../lib/features'

export default function Admin() {
  const navigate = useNavigate()
  const { isAdmin, loading: roleLoading } = useIsAdmin()
  const { users, loading: usersLoading, error: usersError, refetch } = useAdminUsers()
  const [query, setQuery] = useState('')
  const [drillUserId, setDrillUserId] = useState(null)

  // Non-admins should never see this page. If they hit /admin directly,
  // bounce them back to the dashboard once the role check resolves.
  if (!roleLoading && !isAdmin) {
    return (
      <div className="page-container">
        <Card style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }} aria-hidden="true">🔒</p>
          <p className="text-foreground" style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Admin only
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginBottom: 16 }}>
            This page is reserved for the project owner.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ padding: '10px 20px', minWidth: 'auto' }}>
            Back to Dashboard
          </button>
        </Card>
      </div>
    )
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return users
    const q = query.trim().toLowerCase()
    return users.filter(u => {
      const username = emailToUsername(u.email).toLowerCase()
      return username.includes(q) || (u.email || '').toLowerCase().includes(q)
    })
  }, [users, query])

  if (roleLoading || usersLoading) {
    return (
      <div className="page-container">
        <SkeletonLoader count={4} height="h-20" />
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="flex items-center justify-between" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Admin</h1>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 4 }}>
            {users.length} {users.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="btn-secondary"
          style={{ padding: '8px 16px', minWidth: 'auto', fontSize: 12 }}
          aria-label="Refresh"
        >
          ↻ Refresh
        </button>
      </header>

      {usersError && (
        <Card style={{ padding: 16, borderColor: 'var(--danger)' }}>
          <p className="text-foreground" style={{ fontSize: 13, fontWeight: 600 }}>Couldn't load users</p>
          <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 4 }}>{usersError}</p>
          <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 6 }}>
            If this is your first time, make sure you've run <code style={{ fontFamily: 'monospace' }}>supabase-admin-migration.sql</code> in the SQL Editor.
          </p>
        </Card>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username or email…"
          className="form-input"
        />
      </div>

      {/* User list */}
      {filtered.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center' }}>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>
            {query.trim() ? 'No accounts match your search.' : 'No accounts yet.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col" style={{ gap: 10 }}>
          {filtered.map(u => (
            <Card key={u.id} onClick={() => setDrillUserId(u.id)} style={{ padding: '14px 16px' }}>
              <div className="flex items-start justify-between" style={{ gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <p className="text-foreground" style={{ fontSize: 14, fontWeight: 600 }}>
                      {emailToUsername(u.email)}
                    </p>
                    {u.id === users[0]?.id && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                        background: 'var(--primary)', color: 'var(--primary-foreground)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        owner
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 2, fontFamily: 'monospace' }}>
                    {u.email}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 6 }}>
                    Joined {formatRelative(u.created_at)}
                    {u.last_sign_in_at && ` · Last seen ${formatRelative(u.last_sign_in_at)}`}
                  </p>
                </div>
                <svg className="card-chevron w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>

              {/* Activity counts */}
              <div className="grid grid-cols-5 gap-2" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <Counter label="Expenses" value={u.expenses_count} />
                <Counter label="Food"     value={u.food_logs_count} />
                <Counter label="Weight"   value={u.weight_logs_count} />
                <Counter label="Workouts" value={u.workout_logs_count} />
                <Counter label="Goals"    value={u.goals_count} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Drill-down modal */}
      <Modal
        open={drillUserId !== null}
        onClose={() => setDrillUserId(null)}
        title={drillUserId ? `${emailToUsername(users.find(u => u.id === drillUserId)?.email)}` : 'User'}
      >
        {drillUserId && (
          <>
            <UserActivityPanel userId={drillUserId} />
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <FeatureTogglePanel
                userId={drillUserId}
                isOwner={drillUserId === users[0]?.id}
              />
            </div>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <UserResetPanel
                userId={drillUserId}
                username={emailToUsername(users.find(u => u.id === drillUserId)?.email)}
              />
            </div>
          </>
        )}
      </Modal>

      <p className="text-muted-foreground" style={{ fontSize: 11, opacity: 0.6, textAlign: 'center', marginTop: 8 }}>
        For destructive actions (reset password, delete user, edit raw rows) use the{' '}
        <a
          href="https://supabase.com/dashboard/project/cqouqsxjmbwujgdfkbol/auth/users"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--primary)', textDecoration: 'underline' }}
        >
          Supabase dashboard
        </a>.
      </p>
    </div>
  )
}

function Counter({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p className="text-foreground" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>
        {Number(value || 0)}
      </p>
      <p className="text-muted-foreground" style={{ fontSize: 9, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        {label}
      </p>
    </div>
  )
}

function UserActivityPanel({ userId }) {
  const [daysBack, setDaysBack] = useState(14)
  const { activity, loading, error } = useAdminUserRecent(userId, daysBack)

  if (error) {
    return (
      <p className="text-muted-foreground" style={{ fontSize: 13 }}>
        Couldn't load activity: {error}
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 14, gap: 10 }}>
        <p className="text-muted-foreground" style={{ fontSize: 12 }}>
          Last {daysBack} days · {activity.length} {activity.length === 1 ? 'event' : 'events'}
        </p>
        <div className="flex" style={{ gap: 4 }}>
          {[7, 14, 30, 90].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setDaysBack(n)}
              className="btn-pill"
              style={{
                padding: '4px 10px', fontSize: 11,
                background: daysBack === n ? 'var(--primary)' : 'var(--card)',
                color: daysBack === n ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                borderColor: daysBack === n ? 'var(--primary)' : 'var(--border)',
              }}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonLoader count={3} height="h-10" />
      ) : activity.length === 0 ? (
        <p className="text-muted-foreground text-center" style={{ fontSize: 13, padding: '20px 0' }}>
          No activity in the last {daysBack} days.
        </p>
      ) : (
        <div className="flex flex-col" style={{ gap: 6 }}>
          {activity.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
              style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--muted)', gap: 10,
              }}
            >
              <div className="flex items-center" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                <KindBadge kind={row.kind} />
                <div style={{ minWidth: 0 }}>
                  <p className="text-foreground truncate" style={{ fontSize: 12, fontWeight: 500 }}>
                    {row.item}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 2 }}>
                    {formatRelative(row.ts)}
                  </p>
                </div>
              </div>
              <p className="text-foreground" style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {row.amount}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeatureTogglePanel({ userId, isOwner }) {
  const [features, setFeatures] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchUserFeatures(userId)
      .then(list => {
        if (cancelled) return
        setFeatures(list)
        setDirty(false)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        // eslint-disable-next-line no-console
        console.warn('[fetchUserFeatures]', err.message)
        setFeatures([])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  const toggle = (key) => {
    if (isOwner) return // owner toggles are no-ops
    setFeatures(prev => {
      const has = prev.includes(key)
      const next = has ? prev.filter(k => k !== key) : [...prev, key]
      setDirty(true)
      return next
    })
  }

  const save = async () => {
    if (!dirty || isOwner) return
    setSaving(true)
    try {
      await adminSetUserFeatures(userId, features)
      toast.success('Features updated')
      setDirty(false)
    } catch (err) {
      toast.error(err.message || 'Could not save features')
    }
    setSaving(false)
  }

  return (
    <div>
      <p className="stat-label" style={{ marginBottom: 12 }}>Features</p>

      {isOwner ? (
        <p className="text-muted-foreground" style={{ fontSize: 12, lineHeight: 1.5 }}>
          The owner always has every feature — toggles are disabled here so you can't lock yourself out.
        </p>
      ) : loading ? (
        <SkeletonLoader count={3} height="h-10" />
      ) : (
        <>
          <div className="flex flex-col" style={{ gap: 8 }}>
            {FEATURE_CATALOG.map(feature => {
              const enabled = features.includes(feature.key)
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => toggle(feature.key)}
                  aria-pressed={enabled}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${enabled ? 'var(--primary)' : 'var(--border)'}`,
                    background: enabled ? 'rgba(43, 181, 196, 0.06)' : 'var(--card)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: 'inherit',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="text-foreground" style={{ fontSize: 13, fontWeight: 600 }}>
                      <span aria-hidden="true" style={{ marginRight: 6 }}>{feature.emoji}</span>
                      {feature.label}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>
                      {feature.description}
                    </p>
                  </div>
                  {/* Toggle pill */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 36, height: 22, borderRadius: 999,
                      background: enabled ? 'var(--primary)' : 'var(--muted)',
                      position: 'relative', flexShrink: 0,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 2, left: enabled ? 16 : 2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      }}
                    />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 14, gap: 10 }}>
            <p className="text-muted-foreground" style={{ fontSize: 11, lineHeight: 1.5 }}>
              {dirty ? 'Unsaved changes' : 'Up to date'}
            </p>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="btn-primary"
              style={{
                padding: '8px 18px', minWidth: 'auto', fontSize: 13,
                opacity: (!dirty || saving) ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function UserResetPanel({ userId, username }) {
  const [newPw, setNewPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastIssued, setLastIssued] = useState(null)

  const generateTemp = () => {
    // Memorable enough for a one-time hand-off; user will change it.
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let s = ''
    for (let i = 0; i < 10; i++) {
      s += chars[Math.floor(Math.random() * chars.length)]
    }
    return s + '!'
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!newPw || newPw.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (!confirm(`Reset ${username || 'this user'}'s password? They'll be signed out of all devices and need this new password to sign back in.`)) {
      return
    }
    setBusy(true)
    try {
      await adminResetPassword(userId, newPw)
      setLastIssued(newPw)
      setNewPw('')
      toast.success(`Password reset for ${username || 'user'}`)
    } catch (err) {
      toast.error(err.message || 'Could not reset password')
    }
    setBusy(false)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Copy failed — long-press to select')
    }
  }

  return (
    <div>
      <p className="stat-label" style={{ marginBottom: 12 }}>Reset Password</p>

      {lastIssued ? (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--success-soft)',
            border: '1px solid var(--success)',
            marginBottom: 12,
          }}
        >
          <p className="text-foreground" style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            New password for {username}:
          </p>
          <div className="flex items-center" style={{ gap: 8 }}>
            <code
              style={{
                flex: 1, minWidth: 0,
                fontFamily: 'monospace', fontSize: 15, fontWeight: 700,
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--card)', color: 'var(--foreground)',
                wordBreak: 'break-all',
              }}
            >
              {lastIssued}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(lastIssued)}
              className="btn-secondary"
              style={{ padding: '8px 14px', minWidth: 'auto', fontSize: 12, flexShrink: 0 }}
            >
              Copy
            </button>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
            Share this with the user securely. Once they sign in, they should open Settings → Change Password to set their own.
          </p>
          <button
            type="button"
            onClick={() => setLastIssued(null)}
            className="btn-pill"
            style={{ marginTop: 10, padding: '6px 14px', fontSize: 11 }}
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">New temporary password</label>
            <div className="flex" style={{ gap: 8 }}>
              <input
                type="text"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="form-input"
                placeholder="Type or generate"
                minLength={8}
                autoComplete="new-password"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setNewPw(generateTemp())}
                className="btn-secondary"
                style={{ padding: '0 14px', minWidth: 'auto', fontSize: 12, flexShrink: 0 }}
                aria-label="Generate"
              >
                ✨
              </button>
            </div>
            <p className="text-hint">At least 8 characters · they can change it after signing in</p>
          </div>
          <button
            type="submit"
            disabled={busy || !newPw || newPw.length < 8}
            className="btn-primary w-full"
            style={{
              padding: '10px 20px',
              opacity: (busy || !newPw || newPw.length < 8) ? 0.5 : 1,
              background: 'var(--danger)',
              color: '#ffffff',
            }}
          >
            {busy ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      )}
    </div>
  )
}

const KIND_STYLE = {
  food:    { bg: 'rgba(248, 113, 113, 0.12)', fg: 'var(--danger)',  emoji: '🍽' },
  expense: { bg: 'var(--success-soft)',        fg: 'var(--success)', emoji: '💳' },
  weight:  { bg: 'var(--info-soft)',           fg: 'var(--info)',    emoji: '⚖️' },
  workout: { bg: 'rgba(192, 132, 252, 0.12)',  fg: '#C084FC',        emoji: '💪' },
}

function KindBadge({ kind }) {
  const s = KIND_STYLE[kind] || { bg: 'var(--muted)', fg: 'var(--muted-foreground)', emoji: '•' }
  return (
    <span
      aria-hidden="true"
      style={{
        width: 28, height: 28, borderRadius: 8,
        background: s.bg, color: s.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, flexShrink: 0,
      }}
    >
      {s.emoji}
    </span>
  )
}

function formatRelative(ts) {
  if (!ts) return '—'
  const then = new Date(ts)
  const now = new Date()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)   return 'just now'
  if (diffMin < 60)  return `${diffMin} min ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)    return `${diffH} hr ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7)     return `${diffD} day${diffD === 1 ? '' : 's'} ago`
  if (diffD < 30)    return `${Math.floor(diffD / 7)} wk ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
