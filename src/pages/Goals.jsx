import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import ProgressRing from '../components/ProgressRing'
import SkeletonLoader from '../components/SkeletonLoader'
import BodyGoalProgressCard from '../components/BodyGoalProgressCard'
import { useGoals } from '../hooks/useGoals'
import { formatCurrency } from '../lib/helpers'

export default function Goals() {
  const { bodyGoal, financialGoal, loading, saveGoal } = useGoals()
  const [bodyForm, setBodyForm] = useState({ height_ft: '', height_in: '', current_weight: '', target_weight: '', target_date: '' })
  const [finForm, setFinForm] = useState({ savings_target: '', timeline_months: '', saved_so_far: '' })
  const [savedModalOpen, setSavedModalOpen] = useState(false)
  const [savedForm, setSavedForm] = useState('')

  useEffect(() => {
    if (bodyGoal?.data) {
      const d = bodyGoal.data
      setBodyForm({
        height_ft: d.height_ft ? String(d.height_ft) : '',
        height_in: d.height_in != null && d.height_in !== 0 ? String(d.height_in) : '',
        current_weight: d.current_weight ? String(d.current_weight) : '',
        target_weight: d.target_weight ? String(d.target_weight) : '',
        target_date: bodyGoal.target_date || '',
      })
    }
    if (financialGoal?.data) {
      const d = financialGoal.data
      setFinForm({
        savings_target: d.savings_target ? String(d.savings_target) : '',
        timeline_months: d.timeline_months ? String(d.timeline_months) : '',
        saved_so_far: d.saved_so_far ? String(d.saved_so_far) : '',
      })
    }
  }, [bodyGoal, financialGoal])

  const handleBodySave = async (e) => {
    e.preventDefault()
    try {
      await saveGoal({
        type: 'body',
        data: { height_ft: Number(bodyForm.height_ft) || 0, height_in: Number(bodyForm.height_in) || 0, current_weight: Number(bodyForm.current_weight) || 0, target_weight: Number(bodyForm.target_weight) || 0 },
        target_date: bodyForm.target_date || null,
      })
      toast.success('Body goal saved!')
    } catch { toast.error('Failed to save') }
  }

  const handleFinSave = async (e) => {
    e.preventDefault()
    try {
      const targetDate = new Date()
      targetDate.setMonth(targetDate.getMonth() + Number(finForm.timeline_months || 12))
      await saveGoal({
        type: 'financial',
        data: { savings_target: Number(finForm.savings_target), timeline_months: Number(finForm.timeline_months), saved_so_far: Number(finForm.saved_so_far) || 0 },
        target_date: targetDate.toISOString().split('T')[0],
      })
      toast.success('Financial goal saved!')
    } catch { toast.error('Failed to save') }
  }

  const openSavedModal = () => {
    const current = financialGoal?.data?.saved_so_far
    setSavedForm(current != null ? String(current) : '')
    setSavedModalOpen(true)
  }

  const handleSavedQuickSave = async (e) => {
    e.preventDefault()
    const fd = financialGoal?.data
    if (!fd) return
    const next = Number(savedForm)
    if (!isFinite(next) || next < 0) {
      toast.error('Enter a non-negative amount')
      return
    }
    try {
      await saveGoal({
        type: 'financial',
        data: {
          savings_target: Number(fd.savings_target) || 0,
          timeline_months: Number(fd.timeline_months) || 0,
          saved_so_far: next,
        },
        target_date: financialGoal.target_date || null,
      })
      // Keep the edit form in sync with the fresh value.
      setFinForm(f => ({ ...f, saved_so_far: String(next) }))
      toast.success('Saved amount updated!')
      setSavedModalOpen(false)
    } catch { toast.error('Failed to save') }
  }

  if (loading) return <div className="page-container"><SkeletonLoader count={4} height="h-36" /></div>

  // Financial goal calculations
  const fd = financialGoal?.data || {}
  const savedSoFar = fd.saved_so_far || 0
  const savingsTarget = fd.savings_target || 0
  const finPct = savingsTarget > 0 ? Math.min(100, (savedSoFar / savingsTarget) * 100) : 0
  const monthsLeft = fd.timeline_months || 0
  const perMonth = savingsTarget > 0 && monthsLeft > 0 ? ((savingsTarget - savedSoFar) / monthsLeft).toFixed(0) : null

  // The body card pulls from weight_logs itself, so we just need to know
  // whether there's any body goal/entry to show a card for.
  const hasBodyGoal = !!bodyGoal?.data?.target_weight
  const hasFinGoal = savingsTarget > 0

  return (
    <div className="page-container">
      <h1 className="page-title">Goals</h1>

      {/* Progress Cards */}
      {(hasBodyGoal || hasFinGoal) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hasBodyGoal && <BodyGoalProgressCard />}

          {hasFinGoal && (
            <GoalCard
              icon="💰"
              title="Financial Goal"
              accent="var(--goal-financial)"
              accentSoft="var(--goal-financial-soft)"
              percent={finPct}
              metric={`$${savedSoFar.toLocaleString()}`}
              metricLabel={`saved of $${savingsTarget.toLocaleString()}`}
              startLabel="$0"
              endLabel={`$${savingsTarget.toLocaleString()}`}
              chips={[
                perMonth && `$${perMonth}/mo needed`,
                monthsLeft > 0 && `${monthsLeft} months left`,
              ].filter(Boolean)}
              onClick={openSavedModal}
              onClickAriaLabel={`Edit amount saved. Currently ${formatCurrency(savedSoFar)} of ${formatCurrency(savingsTarget)}.`}
            />
          )}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Edit Body Goal */}
      <Card>
        <h2 className="section-title" style={{ marginBottom: 20 }}>Edit Body Goal</h2>
        <form onSubmit={handleBodySave}>
          <div className="form-group">
            <label className="form-label">Height</label>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="relative">
                <input type="number" value={bodyForm.height_ft} onChange={e => setBodyForm(f => ({ ...f, height_ft: e.target.value }))} className="form-input pr-10" placeholder="5" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">ft</span>
              </div>
              <div className="relative">
                <input type="number" value={bodyForm.height_in} onChange={e => setBodyForm(f => ({ ...f, height_in: e.target.value }))} className="form-input pr-10" placeholder="10" min="0" max="11" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">in</span>
              </div>
            </div>
          </div>
          <div className="form-group">
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="form-label">Current Weight (lbs)</label>
                <input type="number" value={bodyForm.current_weight} onChange={e => setBodyForm(f => ({ ...f, current_weight: e.target.value }))} className="form-input" placeholder="190" />
              </div>
              <div>
                <label className="form-label">Target Weight (lbs)</label>
                <input type="number" value={bodyForm.target_weight} onChange={e => setBodyForm(f => ({ ...f, target_weight: e.target.value }))} className="form-input" placeholder="170" />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Target Date</label>
            <input type="date" value={bodyForm.target_date} onChange={e => setBodyForm(f => ({ ...f, target_date: e.target.value }))} className="form-input" />
          </div>
          <button type="submit" className="btn-primary w-full">Save Body Goal</button>
        </form>
      </Card>

      {/* Edit Financial Goal */}
      <Card>
        <h2 className="section-title" style={{ marginBottom: 20 }}>Edit Financial Goal</h2>
        <form onSubmit={handleFinSave}>
          <div className="form-group">
            <label className="form-label">Savings Target ($)</label>
            <input type="number" step="0.01" value={finForm.savings_target} onChange={e => setFinForm(f => ({ ...f, savings_target: e.target.value }))} className="form-input" placeholder="10000" />
          </div>
          <div className="form-group">
            <label className="form-label">Saved So Far ($)</label>
            <input type="number" step="0.01" value={finForm.saved_so_far} onChange={e => setFinForm(f => ({ ...f, saved_so_far: e.target.value }))} className="form-input" placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Timeline (months)</label>
            <input type="number" value={finForm.timeline_months} onChange={e => setFinForm(f => ({ ...f, timeline_months: e.target.value }))} className="form-input" placeholder="12" />
          </div>
          <button type="submit" className="btn-primary w-full">Save Financial Goal</button>
        </form>
      </Card>

      {/* Quick-edit: Amount Saved */}
      <Modal
        open={savedModalOpen}
        onClose={() => setSavedModalOpen(false)}
        title="Update Amount Saved"
      >
        <form onSubmit={handleSavedQuickSave}>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginBottom: 16 }}>
            Target: <span className="text-foreground font-semibold">{formatCurrency(savingsTarget)}</span>
            {monthsLeft > 0 && <> over {monthsLeft} month{monthsLeft !== 1 ? 's' : ''}</>}
          </p>
          <div className="form-group">
            <label className="form-label">Saved So Far ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={savedForm}
              onChange={e => setSavedForm(e.target.value)}
              className="form-input text-2xl font-bold text-center"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary w-full" style={{ padding: '12px 24px' }}>
            Save
          </button>
        </form>
      </Modal>
    </div>
  )
}

function GoalCard({ icon, title, accent, accentSoft, percent, metric, metricLabel, startLabel, endLabel, chips, onClick, onClickAriaLabel }) {
  const clickable = typeof onClick === 'function'
  const Tag = clickable ? 'button' : 'div'
  const interactiveProps = clickable
    ? {
        type: 'button',
        onClick,
        'aria-label': onClickAriaLabel || `Edit ${title}`,
      }
    : {}
  return (
    <Tag
      {...interactiveProps}
      style={{
        background: 'var(--goal-card-bg)',
        borderRadius: 18,
        padding: 26,
        border: `1px solid ${accentSoft}`,
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'inherit',
        color: 'inherit',
        textAlign: 'left',
        width: '100%',
        display: 'block',
      }}
      className={clickable ? 'transition-all hover:border-primary/40' : undefined}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <p className="stat-label" style={{ color: accent, letterSpacing: '0.09em', margin: 0 }}>
          <span aria-hidden="true">{icon}</span> {title}
        </p>
        {clickable && (
          <span
            aria-hidden="true"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: accent,
              opacity: 0.75,
            }}
          >
            Tap to edit
          </span>
        )}
      </div>
      <div className="flex items-center" style={{ gap: 22 }}>
        <ProgressRing percent={percent} color={accent} />
        <div style={{ minWidth: 0 }}>
          <p className="text-foreground" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>{metric}</p>
          <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 6 }}>{metricLabel}</p>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ marginTop: 22 }}>
        <div className="flex justify-between" style={{ marginBottom: 8 }}>
          <span className="text-muted-foreground" style={{ fontSize: 11 }}>{startLabel}</span>
          <span className="text-muted-foreground" style={{ fontSize: 11 }}>{endLabel}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${percent}%`, background: accent }} />
        </div>
      </div>
      {/* Stat chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 16 }}>
          {chips.map((chip, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '5px 11px',
                borderRadius: 999,
                background: accentSoft,
                color: accent,
                whiteSpace: 'nowrap',
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </Tag>
  )
}
