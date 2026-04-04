import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import SkeletonLoader from '../components/SkeletonLoader'
import { useGoals } from '../hooks/useGoals'

export default function Goals() {
  const { bodyGoal, financialGoal, loading, saveGoal } = useGoals()
  const [bodyForm, setBodyForm] = useState({ height_ft: '', height_in: '', current_weight: '', target_weight: '', target_date: '' })
  const [finForm, setFinForm] = useState({ savings_target: '', timeline_months: '' })

  useEffect(() => {
    if (bodyGoal?.data) {
      const d = bodyGoal.data
      setBodyForm({
        height_ft: d.height_ft ? String(d.height_ft) : '',
        height_in: d.height_in != null ? String(d.height_in) : '',
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
      })
    }
  }, [bodyGoal, financialGoal])

  const handleBodySave = async (e) => {
    e.preventDefault()
    try {
      await saveGoal({
        type: 'body',
        data: {
          height_ft: Number(bodyForm.height_ft) || 0,
          height_in: Number(bodyForm.height_in) || 0,
          current_weight: Number(bodyForm.current_weight) || 0,
          target_weight: Number(bodyForm.target_weight) || 0,
        },
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
        data: {
          savings_target: Number(finForm.savings_target),
          timeline_months: Number(finForm.timeline_months),
        },
        target_date: targetDate.toISOString().split('T')[0],
      })
      toast.success('Financial goal saved!')
    } catch { toast.error('Failed to save') }
  }

  if (loading) return <div className="page-container"><SkeletonLoader count={4} height="h-36" /></div>

  const weightDiff = bodyForm.current_weight && bodyForm.target_weight
    ? Number(bodyForm.current_weight) - Number(bodyForm.target_weight)
    : 0

  return (
    <div className="page-container">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Goals</h1>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-5 text-foreground">🏋️ Body Goal</h2>
        <form onSubmit={handleBodySave} className="space-y-4">
          <div>
            <label className="stat-label">Height</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="relative">
                <input
                  type="number"
                  value={bodyForm.height_ft}
                  onChange={e => setBodyForm(f => ({ ...f, height_ft: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm pr-8"
                  placeholder="5"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">ft</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={bodyForm.height_in}
                  onChange={e => setBodyForm(f => ({ ...f, height_in: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm pr-8"
                  placeholder="10"
                  min="0"
                  max="11"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">in</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label">Current Weight (lbs)</label>
              <input type="number" value={bodyForm.current_weight} onChange={e => setBodyForm(f => ({ ...f, current_weight: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm mt-2" placeholder="190" />
            </div>
            <div>
              <label className="stat-label">Target Weight (lbs)</label>
              <input type="number" value={bodyForm.target_weight} onChange={e => setBodyForm(f => ({ ...f, target_weight: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm mt-2" placeholder="170" />
            </div>
          </div>
          {weightDiff !== 0 && (
            <p className="text-xs text-primary font-medium">
              {weightDiff > 0 ? `${weightDiff} lbs to lose` : `${Math.abs(weightDiff)} lbs to gain`}
            </p>
          )}
          <div>
            <label className="stat-label">Target Date</label>
            <input type="date" value={bodyForm.target_date} onChange={e => setBodyForm(f => ({ ...f, target_date: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm mt-2" />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/80 transition-colors">
            Save Body Goal
          </button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-5 text-foreground">💰 Financial Goal</h2>
        <form onSubmit={handleFinSave} className="space-y-4">
          <div>
            <label className="stat-label">Savings Target ($)</label>
            <input type="number" step="0.01" value={finForm.savings_target} onChange={e => setFinForm(f => ({ ...f, savings_target: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm mt-2" placeholder="10000" />
          </div>
          <div>
            <label className="stat-label">Timeline (months)</label>
            <input type="number" value={finForm.timeline_months} onChange={e => setFinForm(f => ({ ...f, timeline_months: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm mt-2" placeholder="12" />
          </div>
          {finForm.savings_target && finForm.timeline_months && (
            <p className="text-xs text-primary font-medium">
              Save ${(Number(finForm.savings_target) / Number(finForm.timeline_months)).toFixed(0)}/month to hit your target
            </p>
          )}
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/80 transition-colors">
            Save Financial Goal
          </button>
        </form>
      </Card>
    </div>
  )
}
