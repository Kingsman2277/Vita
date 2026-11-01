import { useState } from 'react'
import toast from 'react-hot-toast'
import { BottomSheet, Button, Card, ProgressBar, ProgressRing, SectionHeader, TagPill } from './ui'
import { useGoals } from '../hooks/useGoals'
import { formatCurrency } from '../lib/helpers'

/**
 * The savings goal, moved out of the old Goals page and onto Budget
 * (docs/redesign §5, §6.2) — it is a money target, and Progress is now
 * body-only. Editing is limited to "saved so far", which is what the
 * Goals page offered.
 */
function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  )
}

export default function SavingsGoalCard() {
  const { financialGoal, saveGoal } = useGoals()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ saved_so_far: '', savings_target: '', timeline_months: '' })
  const [saving, setSaving] = useState(false)

  const data = financialGoal?.data || {}
  const target = Number(data.savings_target) || 0
  const saved = Number(data.saved_so_far) || 0
  const monthsLeft = Number(data.timeline_months) || 0

  const pct = Math.min(100, (saved / target) * 100)
  const perMonth = monthsLeft > 0 ? (target - saved) / monthsLeft : null

  const openSheet = () => {
    setForm({
      saved_so_far: saved ? String(saved) : '',
      savings_target: target ? String(target) : '',
      timeline_months: monthsLeft ? String(monthsLeft) : '',
    })
    setOpen(true)
  }

  const save = async () => {
    const nextTarget = Number(form.savings_target)
    const months = Number(form.timeline_months)
    const nextSaved = Number(form.saved_so_far) || 0

    if (!form.savings_target || Number.isNaN(nextTarget) || nextTarget <= 0) {
      return toast.error('Enter a savings target')
    }
    if (!form.timeline_months || !Number.isInteger(months) || months <= 0) {
      return toast.error('Enter a timeline in months')
    }
    if (nextSaved < 0) return toast.error('Saved so far cannot be negative')

    // Keep the stored target_date in step with the timeline, the way the
    // old Goals page did.
    const targetDate = new Date()
    targetDate.setMonth(targetDate.getMonth() + months)

    setSaving(true)
    try {
      await saveGoal({
        type: 'financial',
        data: { ...data, savings_target: nextTarget, timeline_months: months, saved_so_far: nextSaved },
        target_date: targetDate.toISOString().split('T')[0],
      })
      toast.success('Savings goal updated')
      setOpen(false)
    } catch (err) {
      console.error('saveGoal financial error:', err)
      toast.error(err?.message || 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <>
      <Card>
        <SectionHeader
          title="Savings goal"
          action={{ label: target > 0 ? 'Edit' : 'Set up', onClick: openSheet }}
        />

        {target <= 0 ? (
          <p className="text-[13px] text-muted mt-2">
            No savings goal yet — set a target and a timeline to track it here.
          </p>
        ) : (
        <div className="flex items-center gap-4 mt-3">
          <ProgressRing value={pct / 100} label={`${Math.round(pct)}%`} sub="saved" />
          <div className="min-w-0 flex-1">
            <p className="text-[28px] font-bold tracking-[-0.02em] text-fg tabular-nums leading-tight">
              {formatCurrency(saved)}
            </p>
            <p className="text-[13px] text-muted mt-0.5">saved of {formatCurrency(target)}</p>
            <ProgressBar value={saved} max={target} className="mt-2.5" />
          </div>
        </div>
        )}

        {target > 0 && (perMonth != null || monthsLeft > 0) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {perMonth != null && <TagPill>{formatCurrency(perMonth)}/mo needed</TagPill>}
            {monthsLeft > 0 && (
              <TagPill tone="neutral">{monthsLeft} month{monthsLeft === 1 ? '' : 's'} left</TagPill>
            )}
          </div>
        )}
      </Card>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Savings goal">
        <Field label="Target amount">
          <input
            type="number" inputMode="decimal" step="0.01"
            value={form.savings_target}
            onChange={e => setForm(f => ({ ...f, savings_target: e.target.value }))}
            className="form-input" placeholder="10000"
          />
        </Field>
        <Field label="Timeline (months)">
          <input
            type="number" inputMode="numeric" step="1"
            value={form.timeline_months}
            onChange={e => setForm(f => ({ ...f, timeline_months: e.target.value }))}
            className="form-input" placeholder="12"
          />
        </Field>
        <Field label="Saved so far">
          <input
            type="number" inputMode="decimal" step="0.01"
            value={form.saved_so_far}
            onChange={e => setForm(f => ({ ...f, saved_so_far: e.target.value }))}
            className="form-input" placeholder="0"
          />
        </Field>
        <Button full disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save goal'}
        </Button>
      </BottomSheet>
    </>
  )
}
