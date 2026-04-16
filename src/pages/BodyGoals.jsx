import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import SkeletonLoader from '../components/SkeletonLoader'
import WeightChart from '../components/WeightChart'
import { useGoals } from '../hooks/useGoals'
import { useWeightLogs } from '../hooks/useWeightLogs'
import { useBodyMetrics } from '../hooks/useBodyMetrics'
import { useExpenses } from '../hooks/useExpenses'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { formatCurrency, formatDate, getToday } from '../lib/helpers'
import { mondayOf, parseDateLocal, toLocalISODate } from '../lib/bodyAnalysis'

const STATUS_COLOR = {
  green: 'var(--success)',
  yellow: 'var(--warning)',
  red: 'var(--danger)',
  unknown: 'var(--muted-foreground)',
}
const STATUS_SOFT = {
  green: 'var(--success-soft)',
  yellow: 'var(--warning-soft)',
  red: 'var(--danger-soft)',
  unknown: 'var(--muted)',
}

export default function BodyGoals() {
  const { bodyGoal, saveGoal, loading: goalLoading } = useGoals()
  const {
    logs, loading: logLoading, saveEntry, deleteEntry, latest, smoothed,
    streak, staleDays, computePace, milestones: milestonesFor,
  } = useWeightLogs()
  const { metrics, loading: metricLoading, saveEntry: saveMetric, deleteEntry: deleteMetric, latestByKey, METRIC_KEYS } = useBodyMetrics()
  const { expenses } = useExpenses()
  const { logs: foodLogs } = useFoodLogs()

  const [logModalOpen, setLogModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [logForm, setLogForm] = useState({ date: getToday(), weight: '', mood: '', energy: '', note: '' })
  const [metricModalOpen, setMetricModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [metricForm, setMetricForm] = useState({ date: getToday(), waist: '', chest: '', hips: '', body_fat: '', note: '' })
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalForm, setGoalForm] = useState({ target_weight: '', target_date: '' })

  // Prefill goal form when opening
  useEffect(() => {
    if (goalModalOpen) {
      setGoalForm({
        target_weight: bodyGoal?.data?.target_weight ? String(bodyGoal.data.target_weight) : '',
        target_date: bodyGoal?.target_date || '',
      })
    }
  }, [goalModalOpen, bodyGoal])

  const target = useMemo(
    () => ({ target_weight: bodyGoal?.data?.target_weight, target_date: bodyGoal?.target_date }),
    [bodyGoal]
  )
  const pace = useMemo(() => computePace(target), [computePace, target])
  const milestones = useMemo(() => milestonesFor(target, 5), [milestonesFor, target])

  const loading = goalLoading || logLoading

  const openNewLog = () => {
    setEditingLog(null)
    setLogForm({ date: getToday(), weight: '', mood: '', energy: '', note: '' })
    setLogModalOpen(true)
  }
  const openEditLog = (log) => {
    setEditingLog(log)
    setLogForm({
      date: log.date,
      weight: String(log.weight),
      mood: log.mood != null ? String(log.mood) : '',
      energy: log.energy != null ? String(log.energy) : '',
      note: log.note || '',
    })
    setLogModalOpen(true)
  }
  const handleSaveLog = async (e) => {
    e.preventDefault()
    try {
      await saveEntry(logForm)
      toast.success('Entry saved!')
      setLogModalOpen(false)
      setEditingLog(null)
    } catch (err) { toast.error(err.message || 'Failed to save') }
  }
  const handleDeleteLog = async () => {
    if (!editingLog) return
    try {
      await deleteEntry(editingLog.id)
      toast.success('Entry deleted')
      setLogModalOpen(false)
      setEditingLog(null)
    } catch { toast.error('Failed to delete') }
  }

  const openNewMetric = () => {
    setEditingMetric(null)
    setMetricForm({ date: getToday(), waist: '', chest: '', hips: '', body_fat: '', note: '' })
    setMetricModalOpen(true)
  }
  const openEditMetric = (m) => {
    setEditingMetric(m)
    setMetricForm({
      date: m.date,
      waist: m.waist != null ? String(m.waist) : '',
      chest: m.chest != null ? String(m.chest) : '',
      hips: m.hips != null ? String(m.hips) : '',
      body_fat: m.body_fat != null ? String(m.body_fat) : '',
      note: m.note || '',
    })
    setMetricModalOpen(true)
  }
  const handleSaveMetric = async (e) => {
    e.preventDefault()
    try {
      await saveMetric(metricForm)
      toast.success('Measurements saved!')
      setMetricModalOpen(false)
      setEditingMetric(null)
    } catch (err) { toast.error(err.message || 'Failed to save') }
  }
  const handleDeleteMetric = async () => {
    if (!editingMetric) return
    try {
      await deleteMetric(editingMetric.id)
      toast.success('Measurement deleted')
      setMetricModalOpen(false)
      setEditingMetric(null)
    } catch { toast.error('Failed to delete') }
  }

  const handleSaveGoal = async (e) => {
    e.preventDefault()
    try {
      await saveGoal({
        type: 'body',
        data: {
          ...(bodyGoal?.data || {}),
          target_weight: Number(goalForm.target_weight),
        },
        target_date: goalForm.target_date || null,
      })
      toast.success('Goal updated!')
      setGoalModalOpen(false)
    } catch { toast.error('Failed to save') }
  }

  if (loading) return <div className="page-container"><SkeletonLoader count={4} height="h-40" /></div>

  const targetWeight = Number(target.target_weight) || null
  const startWeight = logs[0]?.weight || null
  const currentWeight = latest?.weight || null
  const lostTotal = startWeight != null && currentWeight != null ? startWeight - currentWeight : null
  const hasMood = logs.some(l => l.mood != null)

  return (
    <div className="page-container">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Body Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {currentWeight != null ? `${currentWeight.toFixed(1)} lbs current` : 'No entries yet'}
            {targetWeight && currentWeight != null && ` · ${(currentWeight - targetWeight).toFixed(1)} lbs to go`}
          </p>
        </div>
        <button onClick={openNewLog} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>
          + Weight
        </button>
      </header>

      {/* Hero: Pace + Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="hero-card" style={{ padding: 24 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <StatusDot status={pace.status} />
            <p className="label stat-label" style={{ margin: 0 }}>Pace</p>
          </div>
          <p className="text-foreground" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
            {pace.label}
          </p>
          {pace.slopePerDay != null && (
            <p className="text-muted-foreground mt-2" style={{ fontSize: 12 }}>
              {pace.slopePerDay > 0 ? '+' : ''}{(pace.slopePerDay * 7).toFixed(2)} lbs/week trend
              {targetWeight != null && target.target_date && <> · goal {new Date(target.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
            </p>
          )}
          <button onClick={() => setGoalModalOpen(true)} className="btn-secondary" style={{ marginTop: 16, padding: '8px 16px', minWidth: 'auto', fontSize: 12 }}>
            {targetWeight ? 'Edit goal' : 'Set a goal'}
          </button>
        </div>

        <div className="hero-card" style={{ padding: 24 }}>
          <p className="label stat-label" style={{ marginBottom: 12 }}>Logging Streak</p>
          <p className="text-foreground" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>
            {streak} <span className="text-muted-foreground" style={{ fontSize: 16, fontWeight: 500 }}>day{streak === 1 ? '' : 's'}</span>
          </p>
          {staleDays != null && staleDays >= 3 && (
            <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 10 }}>
              Last logged {staleDays} days ago
            </p>
          )}
          {lostTotal != null && lostTotal > 0 && (
            <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 10 }}>
              −{lostTotal.toFixed(1)} lbs from start
            </p>
          )}
          {lostTotal != null && lostTotal < 0 && (
            <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 10 }}>
              +{Math.abs(lostTotal).toFixed(1)} lbs from start
            </p>
          )}
        </div>
      </div>

      {/* Trend chart */}
      <Card style={{ padding: '20px 20px 16px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Weight Trend</h2>
          <span className="text-muted-foreground" style={{ fontSize: 12 }}>
            {logs.length} entr{logs.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
        <WeightChart
          smoothed={smoothed}
          milestones={milestones}
          targetWeight={targetWeight}
          showMood={hasMood}
          logs={logs}
        />
        {milestones.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
            {milestones.map(m => (
              <span key={`${m.weight}-${m.date}`} style={{
                fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 999,
                background: 'var(--success-soft)', color: 'var(--success)', whiteSpace: 'nowrap',
              }}>
                🎯 {m.weight} on {formatDate(m.date)}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Weekly Insights: cross-reference food + spend */}
      <WeeklyInsights logs={logs} expenses={expenses} foodLogs={foodLogs} />

      {/* Body measurements */}
      <section>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Body Measurements</h2>
          <button onClick={openNewMetric} className="btn-secondary" style={{ padding: '8px 16px', minWidth: 'auto', fontSize: 12 }}>
            + Measurement
          </button>
        </div>
        {metricLoading ? (
          <SkeletonLoader count={1} height="h-24" />
        ) : METRIC_KEYS.every(k => !latestByKey[k]) ? (
          <Card style={{ padding: 20 }}>
            <p className="text-muted-foreground text-sm text-center">
              No measurements yet. Track waist, chest, hips, and body fat % to see progress beyond the scale.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {METRIC_KEYS.map(k => {
              const latest = latestByKey[k]
              return (
                <Card key={k} style={{ padding: 16 }}>
                  <p className="stat-label" style={{ fontSize: 10 }}>{METRIC_LABEL[k]}</p>
                  <p className="text-foreground" style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
                    {latest ? `${latest.value}${k === 'body_fat' ? '%' : '"'}` : '—'}
                  </p>
                  {latest && <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 4 }}>{formatDate(latest.date)}</p>}
                </Card>
              )
            })}
          </div>
        )}
        {metrics.length > 0 && (
          <details className="mt-3">
            <summary className="text-muted-foreground text-xs cursor-pointer" style={{ padding: '8px 0' }}>
              {metrics.length} measurement{metrics.length === 1 ? '' : 's'} logged — view history
            </summary>
            <div className="flex flex-col gap-2 mt-2">
              {[...metrics].reverse().map(m => (
                <Card key={m.id} onClick={() => openEditMetric(m)} className="cursor-pointer" style={{ padding: '12px 14px' }}>
                  <div className="flex items-center justify-between" style={{ gap: 12 }}>
                    <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                    <p className="text-xs text-foreground">
                      {METRIC_KEYS.filter(k => m[k] != null).map(k => `${METRIC_LABEL_SHORT[k]} ${m[k]}${k === 'body_fat' ? '%' : '"'}`).join(' · ')}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* Log history */}
      <section>
        <h2 className="section-title" style={{ marginBottom: 14 }}>Weight History</h2>
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚖️</div>
            <p className="empty-state-title">No weight entries yet</p>
            <p className="empty-state-desc">Log your first weight to start seeing trends and pace.</p>
            <button onClick={openNewLog} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>
              Add first entry
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...logs].reverse().slice(0, 30).map(l => (
              <Card key={l.id} onClick={() => openEditLog(l)} className="cursor-pointer" style={{ padding: '12px 16px' }}>
                <div className="flex items-center justify-between" style={{ gap: 12 }}>
                  <div>
                    <p className="text-foreground font-semibold text-sm">{l.weight.toFixed(1)} lbs</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{formatDate(l.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {l.mood != null && <span className="text-xs text-muted-foreground">mood {l.mood}/5</span>}
                    {l.energy != null && <span className="text-xs text-muted-foreground">energy {l.energy}/5</span>}
                    <svg className="card-chevron w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Card>
            ))}
            {logs.length > 30 && <p className="text-xs text-muted-foreground text-center mt-2">Showing most recent 30 of {logs.length}</p>}
          </div>
        )}
      </section>

      {/* Weight entry modal */}
      <Modal
        open={logModalOpen}
        onClose={() => { setLogModalOpen(false); setEditingLog(null) }}
        title={editingLog ? 'Edit Entry' : 'Log Weight'}
      >
        <form onSubmit={handleSaveLog}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} className="form-input" required disabled={!!editingLog} />
          </div>
          <div className="form-group">
            <label className="form-label">Weight (lbs)</label>
            <input type="number" step="0.1" min="0" value={logForm.weight} onChange={e => setLogForm(f => ({ ...f, weight: e.target.value }))} className="form-input text-2xl font-bold text-center" required autoFocus placeholder="0.0" />
          </div>
          <div className="form-group">
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="form-label">Mood (1-5)</label>
                <RatingPicker value={logForm.mood} onChange={v => setLogForm(f => ({ ...f, mood: v }))} />
              </div>
              <div>
                <label className="form-label">Energy (1-5)</label>
                <RatingPicker value={logForm.energy} onChange={v => setLogForm(f => ({ ...f, energy: v }))} />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input value={logForm.note} onChange={e => setLogForm(f => ({ ...f, note: e.target.value }))} className="form-input" placeholder="Anything to remember" />
          </div>
          <div className="flex gap-3">
            {editingLog && (
              <button type="button" onClick={handleDeleteLog} className="btn-secondary flex-1" style={{ padding: '12px 24px', color: 'var(--destructive)', borderColor: 'var(--destructive)' }}>
                Delete
              </button>
            )}
            <button type="submit" className="btn-primary flex-1" style={{ padding: '12px 24px' }}>
              {editingLog ? 'Save Changes' : 'Save Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Body metric entry modal */}
      <Modal
        open={metricModalOpen}
        onClose={() => { setMetricModalOpen(false); setEditingMetric(null) }}
        title={editingMetric ? 'Edit Measurements' : 'Log Measurements'}
      >
        <form onSubmit={handleSaveMetric}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" value={metricForm.date} onChange={e => setMetricForm(f => ({ ...f, date: e.target.value }))} className="form-input" required disabled={!!editingMetric} />
          </div>
          <div className="form-group">
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="form-label">Waist (in)</label>
                <input type="number" step="0.1" value={metricForm.waist} onChange={e => setMetricForm(f => ({ ...f, waist: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Chest (in)</label>
                <input type="number" step="0.1" value={metricForm.chest} onChange={e => setMetricForm(f => ({ ...f, chest: e.target.value }))} className="form-input" />
              </div>
            </div>
          </div>
          <div className="form-group">
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="form-label">Hips (in)</label>
                <input type="number" step="0.1" value={metricForm.hips} onChange={e => setMetricForm(f => ({ ...f, hips: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Body fat (%)</label>
                <input type="number" step="0.1" value={metricForm.body_fat} onChange={e => setMetricForm(f => ({ ...f, body_fat: e.target.value }))} className="form-input" />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input value={metricForm.note} onChange={e => setMetricForm(f => ({ ...f, note: e.target.value }))} className="form-input" />
          </div>
          <div className="flex gap-3">
            {editingMetric && (
              <button type="button" onClick={handleDeleteMetric} className="btn-secondary flex-1" style={{ padding: '12px 24px', color: 'var(--destructive)', borderColor: 'var(--destructive)' }}>
                Delete
              </button>
            )}
            <button type="submit" className="btn-primary flex-1" style={{ padding: '12px 24px' }}>
              {editingMetric ? 'Save Changes' : 'Save Measurements'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Goal modal */}
      <Modal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Body Goal">
        <form onSubmit={handleSaveGoal}>
          <div className="form-group">
            <label className="form-label">Target Weight (lbs)</label>
            <input type="number" step="0.1" value={goalForm.target_weight} onChange={e => setGoalForm(f => ({ ...f, target_weight: e.target.value }))} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Target Date</label>
            <input type="date" value={goalForm.target_date} onChange={e => setGoalForm(f => ({ ...f, target_date: e.target.value }))} className="form-input" />
          </div>
          <button type="submit" className="btn-primary w-full" style={{ padding: '12px 24px' }}>Save Goal</button>
        </form>
      </Modal>
    </div>
  )
}

const METRIC_LABEL = {
  waist: 'WAIST',
  chest: 'CHEST',
  hips: 'HIPS',
  body_fat: 'BODY FAT',
}
const METRIC_LABEL_SHORT = { waist: 'waist', chest: 'chest', hips: 'hips', body_fat: 'BF' }

function StatusDot({ status }) {
  return (
    <span
      aria-label={`Status: ${status}`}
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: STATUS_COLOR[status] || STATUS_COLOR.unknown,
        boxShadow: `0 0 0 4px ${STATUS_SOFT[status] || STATUS_SOFT.unknown}`,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}

function RatingPicker({ value, onChange }) {
  return (
    <div className="flex gap-1 mt-1">
      {[1, 2, 3, 4, 5].map(n => {
        const selected = String(value) === String(n)
        return (
          <button
            type="button"
            key={n}
            onClick={() => onChange(selected ? '' : String(n))}
            className="flex-1 rounded-lg border text-sm font-semibold transition-all"
            style={{
              padding: '10px 0',
              borderColor: selected ? 'var(--primary)' : 'var(--border)',
              background: selected ? 'var(--secondary)' : 'var(--card)',
              color: selected ? 'var(--secondary-foreground)' : 'var(--muted-foreground)',
            }}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Weekly Insights panel ─── */
function WeeklyInsights({ logs, expenses, foodLogs }) {
  const rows = useMemo(() => {
    if (!logs || logs.length === 0) return []
    const out = []
    const today = new Date()
    const thisMon = mondayOf(today)
    for (let i = 0; i < 4; i++) {
      const start = new Date(thisMon)
      start.setDate(start.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)

      const weekWeights = logs.filter(l => {
        const d = parseDateLocal(l.date)
        return d >= start && d <= end
      })
      if (weekWeights.length === 0) continue
      const avgWeight = weekWeights.reduce((s, p) => s + p.weight, 0) / weekWeights.length

      const prevStart = new Date(start)
      prevStart.setDate(prevStart.getDate() - 7)
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevWeights = logs.filter(l => {
        const d = parseDateLocal(l.date)
        return d >= prevStart && d <= prevEnd
      })
      const prevAvg = prevWeights.length ? prevWeights.reduce((s, p) => s + p.weight, 0) / prevWeights.length : null

      const weekFood = (foodLogs || []).filter(f => {
        const d = f.logged_at ? new Date(f.logged_at) : null
        return d && d >= start && d <= new Date(end.getTime() + 86399999)
      })
      const dayKeys = new Set(weekFood.map(f => new Date(f.logged_at).toDateString()))
      const daysLogged = dayKeys.size
      const weekCals = weekFood.reduce((s, f) => s + Number(f.calories || 0), 0)
      const avgCals = daysLogged > 0 ? weekCals / daysLogged : null

      const weekEatingOut = (expenses || [])
        .filter(e => {
          if (e.is_recurring) return false
          if ((e.category || 'other') !== 'eating_out' && e.category !== 'food') return false
          const d = parseDateLocal(e.date)
          return d && d >= start && d <= end
        })
        .reduce((s, e) => s + Number(e.amount), 0)

      out.push({
        label: i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i} weeks ago`,
        start: toLocalISODate(start),
        end: toLocalISODate(end),
        avgWeight,
        weightChange: prevAvg != null ? avgWeight - prevAvg : null,
        avgCals,
        daysLogged,
        eatingOut: weekEatingOut,
      })
    }
    return out
  }, [logs, expenses, foodLogs])

  if (rows.length === 0) return null

  return (
    <section>
      <h2 className="section-title" style={{ marginBottom: 14 }}>Weekly Insights</h2>
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <Card key={r.start} style={{ padding: '14px 16px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <p className="font-semibold text-sm text-foreground">{r.label}</p>
              <p className="text-xs text-muted-foreground">{formatDate(r.start)} – {formatDate(r.end)}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <InsightCell label="Avg weight" value={`${r.avgWeight.toFixed(1)} lbs`} delta={r.weightChange != null ? `${r.weightChange >= 0 ? '+' : ''}${r.weightChange.toFixed(1)}` : null} deltaColor={r.weightChange == null ? null : r.weightChange < 0 ? 'var(--success)' : 'var(--warning)'} />
              <InsightCell label="Avg cals/day" value={r.avgCals != null ? Math.round(r.avgCals).toLocaleString() : '—'} sub={r.avgCals != null ? `${r.daysLogged} day${r.daysLogged === 1 ? '' : 's'} logged` : 'no food logs'} />
              <InsightCell label="Eating out" value={formatCurrency(r.eatingOut)} />
            </div>
          </Card>
        ))}
      </div>
      <p className="text-hint mt-3">Data side-by-side so you can spot your own patterns.</p>
    </section>
  )
}

function InsightCell({ label, value, delta, deltaColor, sub }) {
  return (
    <div>
      <p className="stat-label" style={{ fontSize: 9, marginBottom: 4 }}>{label}</p>
      <p className="text-foreground font-semibold" style={{ fontSize: 14 }}>{value}</p>
      {delta && <p style={{ fontSize: 11, color: deltaColor || 'var(--muted-foreground)', marginTop: 2 }}>{delta} lbs</p>}
      {sub && <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 2 }}>{sub}</p>}
    </div>
  )
}
