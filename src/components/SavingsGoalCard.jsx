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
export default function SavingsGoalCard() {
  const { financialGoal, saveGoal } = useGoals()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const data = financialGoal?.data || {}
  const target = Number(data.savings_target) || 0
  const saved = Number(data.saved_so_far) || 0
  const monthsLeft = Number(data.timeline_months) || 0

  if (target <= 0) return null

  const pct = Math.min(100, (saved / target) * 100)
  const perMonth = monthsLeft > 0 ? (target - saved) / monthsLeft : null

  const openSheet = () => {
    setAmount(saved ? String(saved) : '')
    setOpen(true)
  }

  const save = async () => {
    const next = Number(amount)
    if (!isFinite(next) || next < 0) return toast.error('Enter an amount')
    setSaving(true)
    try {
      await saveGoal({
        type: 'financial',
        data: { ...data, saved_so_far: next },
        target_date: financialGoal.target_date || null,
      })
      toast.success('Savings updated')
      setOpen(false)
    } catch {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  return (
    <>
      <Card>
        <SectionHeader title="Savings goal" action={{ label: 'Edit', onClick: openSheet }} />

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

        {(perMonth != null || monthsLeft > 0) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {perMonth != null && <TagPill>{formatCurrency(perMonth)}/mo needed</TagPill>}
            {monthsLeft > 0 && (
              <TagPill tone="neutral">{monthsLeft} month{monthsLeft === 1 ? '' : 's'} left</TagPill>
            )}
          </div>
        )}
      </Card>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Amount saved">
        <p className="text-[13px] text-muted mb-4">
          Total put aside towards {formatCurrency(target)}
          {monthsLeft > 0 && <> over {monthsLeft} month{monthsLeft === 1 ? '' : 's'}</>}.
        </p>
        <label className="block mb-4">
          <span className="block text-xs font-medium text-muted mb-1.5">Saved so far</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-card-2 rounded-[12px] px-3.5 min-h-[44px] text-fg"
          />
        </label>
        <Button full disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </BottomSheet>
    </>
  )
}
