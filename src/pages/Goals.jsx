import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import ProgressRing from '../components/ProgressRing'
import SkeletonLoader from '../components/SkeletonLoader'
import { useGoals } from '../hooks/useGoals'

export default function Goals() {
  const { bodyGoal, financialGoal, loading, saveGoal } = useGoals()
  const [bodyForm, setBodyForm] = useState({ height_ft: '', height_in: '', current_weight: '', target_weight: '', target_date: '' })
  const [finForm, setFinForm] = useState({ savings_target: '', timeline_months: '', saved_so_far: '' })

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

  if (loading) return <div className="page-container"><SkeletonLoader count={4} height="h-36" /></div>

  // Body goal calculations
  const bd = bodyGoal?.data || {}
  const startW = bd.current_weight || 0
  const targetW = bd.target_weight || 0
  const weightDiff = startW - targetW
  const bodyPct = weightDiff > 0 ? Math.max(0, Math.min(100, ((startW - startW) / weightDiff) * 100)) : 0
  // Since we don't track starting weight separately, show current distance
  const bodyProgress = startW && targetW && weightDiff !== 0 ? Math.max(0, Math.min(100, 100 - (Math.abs(startW - targetW) / Math.max(startW, targetW)) * 100)) : 0

  // Days remaining
  const daysRemaining = bodyGoal?.target_date
    ? Math.max(0, Math.ceil((new Date(bodyGoal.target_date + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24)))
    : null
  const weeksRemaining = daysRemaining != null ? Math.ceil(daysRemaining / 7) : null
  const lbsPerWeek = weeksRemaining && weightDiff > 0 ? (weightDiff / weeksRemaining).toFixed(1) : null

  // Financial goal calculations
  const fd = financialGoal?.data || {}
  const savedSoFar = fd.saved_so_far || 0
  const savingsTarget = fd.savings_target || 0
  const finPct = savingsTarget > 0 ? Math.min(100, (savedSoFar / savingsTarget) * 100) : 0
  const monthsLeft = fd.timeline_months || 0
  const perMonth = savingsTarget > 0 && monthsLeft > 0 ? ((savingsTarget - savedSoFar) / monthsLeft).toFixed(0) : null

  const hasBodyGoal = startW > 0 && targetW > 0
  const hasFinGoal = savingsTarget > 0

  return (
    <div className="page-container">
      <h1 className="page-title">Goals</h1>

      {/* Progress Cards */}
      {(hasBodyGoal || hasFinGoal) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hasBodyGoal && (
            <div style={{ background: '#1a1a18', borderRadius: 16, padding: 24, border: '1px solid rgba(200,90,90,0.12)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#c85a5a' }}>🏆 Body Goal</p>
              <div className="flex items-center gap-5">
                <ProgressRing percent={bodyProgress} color="#c85a5a" />
                <div>
                  <p className="text-[28px] font-bold text-foreground leading-none">{startW}</p>
                  <p className="text-[12px] text-muted-foreground mt-1">current lbs</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-5">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-2">
                  <span>{startW} lbs</span>
                  <span>{targetW} lbs</span>
                </div>
                <div className="h-[6px] bg-muted rounded-[3px] overflow-hidden">
                  <div className="h-full rounded-[3px] transition-all duration-500" style={{ width: `${bodyProgress}%`, background: '#c85a5a' }} />
                </div>
              </div>
              {/* Stats */}
              <div className="flex gap-2 mt-4">
                {lbsPerWeek && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,90,90,0.12)', color: '#c85a5a' }}>
                    {lbsPerWeek} lbs/week needed
                  </span>
                )}
                {daysRemaining != null && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,90,90,0.12)', color: '#c85a5a' }}>
                    {daysRemaining} days left
                  </span>
                )}
              </div>
            </div>
          )}

          {hasFinGoal && (
            <div style={{ background: '#1a1a18', borderRadius: 16, padding: 24, border: '1px solid rgba(93,200,122,0.12)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#5dc87a' }}>💰 Financial Goal</p>
              <div className="flex items-center gap-5">
                <ProgressRing percent={finPct} color="#5dc87a" />
                <div>
                  <p className="text-[28px] font-bold text-foreground leading-none">${savedSoFar.toLocaleString()}</p>
                  <p className="text-[12px] text-muted-foreground mt-1">saved of ${savingsTarget.toLocaleString()}</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-5">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-2">
                  <span>$0</span>
                  <span>${savingsTarget.toLocaleString()}</span>
                </div>
                <div className="h-[6px] bg-muted rounded-[3px] overflow-hidden">
                  <div className="h-full rounded-[3px] transition-all duration-500" style={{ width: `${finPct}%`, background: '#5dc87a' }} />
                </div>
              </div>
              {/* Stats */}
              <div className="flex gap-2 mt-4">
                {perMonth && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(93,200,122,0.12)', color: '#5dc87a' }}>
                    ${perMonth}/mo needed
                  </span>
                )}
                {monthsLeft > 0 && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(93,200,122,0.12)', color: '#5dc87a' }}>
                    {monthsLeft} months left
                  </span>
                )}
              </div>
            </div>
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
    </div>
  )
}
