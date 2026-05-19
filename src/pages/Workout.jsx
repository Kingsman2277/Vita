import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import SkeletonLoader from '../components/SkeletonLoader'
import JumpToTodayButton from '../components/JumpToTodayButton'
import MonthPicker from '../components/MonthPicker'
import DayPicker from '../components/DayPicker'
import ProgramEditor from '../components/ProgramEditor'
import { useWorkoutLogs } from '../hooks/useWorkoutLogs'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import { getToday } from '../lib/helpers'

// Muscle-group → color. Maps to existing semantic tokens where possible
// and uses inline hex for groups without a token equivalent.
const MUSCLE_COLOR = {
  cardio: '#F97316',     // orange — matches eating_out / warning vibe
  legs:   '#A78BFA',     // purple
  push:   'var(--info)', // blue
  pull:   'var(--success)', // green
  arms:   '#F472B6',     // pink
}

const DOW_LABEL = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' }
const DOW_LABEL_LONG = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' }

function parseISODateLocal(s) {
  if (!s) return null
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLongDate(iso) {
  const d = parseISODateLocal(iso)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function Workout() {
  const today = new Date()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const [selectedDay, setSelectedDay] = useState(today.getDate())

  // Reset day when month changes — same pattern as Food/Finance.
  const monthKey = `${selectedMonth.year}-${selectedMonth.month}`
  const [prevMonthKey, setPrevMonthKey] = useState(monthKey)
  if (monthKey !== prevMonthKey) {
    setPrevMonthKey(monthKey)
    setSelectedDay(isCurrentMonth ? today.getDate() : 1)
  }

  const dateObj = useMemo(
    () => new Date(selectedMonth.year, selectedMonth.month, selectedDay),
    [selectedMonth.year, selectedMonth.month, selectedDay]
  )
  const selectedDate = useMemo(() => {
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [dateObj])

  const {
    dayTemplate,
    exercises,
    isWeekend,
    allDone,
    completedCount,
    totalCount,
    toggleComplete,
    updateNote,
    updateWeight,
    streak,
    weekStats,
    daysWithData,
    loading,
    hasTemplates,
    templates,
    addProgramExercise,
    updateProgramExercise,
    deleteProgramExercise,
    resetProgramToDefaults,
    clearProgram,
    resetDay,
  } = useWorkoutLogs(dateObj)
  const [programEditorOpen, setProgramEditorOpen] = useState(false)
  const [resettingDay, setResettingDay] = useState(false)

  const handleResetDay = async () => {
    if (!confirm("Reset today's checklist? This deletes today's tracked exercises (including completion status, weights, and notes) so the day auto-populates fresh from your program. Past days are untouched.")) return
    setResettingDay(true)
    try {
      await resetDay(selectedDate)
      toast.success('Day reset')
    } catch (err) {
      toast.error(err.message || 'Could not reset day')
    }
    setResettingDay(false)
  }

  const [expandedOrder, setExpandedOrder] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [sessionNote, setSessionNote] = useState('')

  // One-time celebration toast when the day ticks over to all-done.
  const prevAllDone = useMemo(() => allDone, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (allDone && !prevAllDone && totalCount > 0) {
      setShowCelebration(true)
    }
  }, [allDone, prevAllDone, totalCount])

  const todayStr = getToday()
  const isToday = selectedDate === todayStr

  if (loading) {
    return (
      <div className="page-container">
        <SkeletonLoader count={6} height="h-20" />
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* ─── Header ─── */}
      <header className="flex items-start justify-between" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Workout</h1>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 4 }}>
            {isToday ? "Today's session" : formatLongDate(selectedDate)}
          </p>
        </div>
        <div className="flex" style={{ gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleResetDay}
            disabled={resettingDay || isWeekend || exercises.length === 0}
            className="btn-secondary"
            title="Reset today's checklist"
            style={{
              padding: '8px 12px', minWidth: 'auto', fontSize: 12,
              opacity: (resettingDay || isWeekend || exercises.length === 0) ? 0.5 : 1,
            }}
          >
            ↻
          </button>
          <button
            type="button"
            onClick={() => setProgramEditorOpen(true)}
            className="btn-secondary"
            style={{ padding: '8px 14px', minWidth: 'auto', fontSize: 12 }}
          >
            ✎ Edit Program
          </button>
        </div>
      </header>

      <MonthPicker
        label={label}
        onPrev={goToPrev}
        onNext={goToNext}
        onToday={() => { goToCurrentMonth(); setSelectedDay(today.getDate()) }}
        isCurrentMonth={isCurrentMonth}
      />

      <DayPicker
        year={selectedMonth.year}
        month={selectedMonth.month}
        selectedDay={selectedDay}
        onSelectDay={d => { if (d != null) setSelectedDay(d) }}
        daysWithData={daysWithData}
      />

      <JumpToTodayButton
        isCurrentMonth={isCurrentMonth}
        selectedDay={selectedDay}
        onJump={() => { goToCurrentMonth(); setSelectedDay(today.getDate()) }}
      />

      {/* ─── Hero stats card ─── */}
      <div className="hero-card" style={{ padding: 24 }}>
        <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <p className="label stat-label">{isWeekend ? 'Rest Day' : (dayTemplate?.day_label || 'Workout')}</p>
            {!isWeekend && (
              <p className="text-foreground" style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
                {DOW_LABEL_LONG[dayTemplate?.day_of_week] || ''}
              </p>
            )}
          </div>
          {!isWeekend && totalCount > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p
                className="text-foreground"
                style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}
              >
                {completedCount}<span className="text-muted-foreground" style={{ fontSize: 16, fontWeight: 600 }}>/{totalCount}</span>
              </p>
              <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 4 }}>complete</p>
            </div>
          )}
        </div>

        {/* Streak + week dots */}
        <div className="flex items-center justify-between" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <span style={{ fontSize: 22 }} aria-hidden="true">🔥</span>
            <div>
              <p
                className="text-foreground"
                style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}
              >
                {streak} <span className="text-muted-foreground" style={{ fontSize: 12, fontWeight: 600 }}>day{streak === 1 ? '' : 's'}</span>
              </p>
              <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>streak</p>
            </div>
          </div>

          <WeekDots weekStats={weekStats} />
        </div>
      </div>

      {/* ─── Body ─── */}
      {!hasTemplates ? (
        <Card style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }} aria-hidden="true">🏋️</p>
          <p className="text-foreground" style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Your program is empty
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 320, margin: '0 auto 18px' }}>
            Build your own routine by adding exercises for each weekday, or load the default 5-day full-body program to get started.
          </p>
          <div className="flex" style={{ gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setProgramEditorOpen(true)}
              className="btn-primary"
              style={{ padding: '10px 18px', minWidth: 'auto', fontSize: 13 }}
            >
              ✎ Edit Program
            </button>
            <button
              type="button"
              onClick={async () => {
                try { await resetProgramToDefaults(); toast.success('Default program loaded') }
                catch (err) { toast.error(err.message || 'Could not load defaults') }
              }}
              className="btn-secondary"
              style={{ padding: '10px 18px', minWidth: 'auto', fontSize: 13 }}
            >
              Load defaults
            </button>
          </div>
        </Card>
      ) : isWeekend ? (
        <RestDayCard date={selectedDate} />
      ) : exercises.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center' }}>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>
            No exercises scheduled for {DOW_LABEL_LONG[dayTemplate?.day_of_week] || 'this day'}. Tap <strong className="text-foreground">Edit Program</strong> to add some.
          </p>
        </Card>
      ) : (
        <>
          <section className="flex flex-col" style={{ gap: 12 }}>
            {exercises.map(ex => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                isExpanded={expandedOrder === ex.exercise_order}
                onExpand={() => setExpandedOrder(expandedOrder === ex.exercise_order ? null : ex.exercise_order)}
                onToggle={async () => {
                  try { await toggleComplete(ex.exercise_order) }
                  catch { toast.error('Could not save — try again') }
                }}
                onWeightChange={async v => {
                  try { await updateWeight(ex.exercise_order, v) }
                  catch { toast.error('Could not save weight') }
                }}
                onNoteChange={async v => {
                  try { await updateNote(ex.exercise_order, v) }
                  catch { toast.error('Could not save note') }
                }}
              />
            ))}
          </section>

          {allDone && (
            <DoneCard
              count={totalCount}
              note={sessionNote}
              onNoteChange={setSessionNote}
            />
          )}
        </>
      )}

      {showCelebration && (
        <CelebrationToast onClose={() => setShowCelebration(false)} count={totalCount} />
      )}

      <ProgramEditor
        open={programEditorOpen}
        onClose={() => setProgramEditorOpen(false)}
        templates={templates}
        actions={{
          addProgramExercise,
          updateProgramExercise,
          deleteProgramExercise,
          resetProgramToDefaults,
          clearProgram,
        }}
      />
    </div>
  )
}

/* ─── Components ───────────────────────────────────────────────────────── */

function WeekDots({ weekStats }) {
  return (
    <div className="flex items-center" style={{ gap: 6 }} aria-label="This week's progress">
      {weekStats.days.map((d, idx) => {
        const baseStyle = {
          width: 28, height: 28, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.04em',
          flexShrink: 0,
        }
        let style, label
        if (d.status === 'done') {
          style = { ...baseStyle, background: 'var(--success)', color: '#0C0F14' }
          label = 'done'
        } else if (d.status === 'partial') {
          style = { ...baseStyle, background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' }
          label = 'partial'
        } else if (d.status === 'today') {
          style = { ...baseStyle, background: 'transparent', color: 'var(--primary)', border: '2px solid var(--primary)' }
          label = 'today'
        } else if (d.status === 'missed') {
          style = { ...baseStyle, background: 'transparent', color: 'rgba(240,242,245,0.3)', border: '1px dashed rgba(255,255,255,0.06)' }
          label = 'missed'
        } else {
          style = { ...baseStyle, background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
          label = 'empty'
        }
        return (
          <span key={idx} style={style} aria-label={`${DOW_LABEL[d.dayOfWeek]} ${label}`}>
            {DOW_LABEL[d.dayOfWeek][0]}
          </span>
        )
      })}
    </div>
  )
}

function ExerciseRow({ exercise, isExpanded, onExpand, onToggle, onWeightChange, onNoteChange }) {
  const color = MUSCLE_COLOR[exercise.muscle_group] || 'var(--muted-foreground)'
  const [weight, setWeight] = useState(exercise.weight_used || '')
  const [note, setNote] = useState(exercise.note || '')

  // Keep local input state in sync if the row is changed elsewhere (e.g.
  // re-fetch after a server-side edit).
  useEffect(() => {
    setWeight(exercise.weight_used || '')
    setNote(exercise.note || '')
  }, [exercise.id, exercise.weight_used, exercise.note])

  return (
    <Card
      style={{
        padding: '14px 16px',
        background: exercise.completed ? 'rgba(52, 211, 153, 0.06)' : 'var(--card)',
        borderColor: exercise.completed ? 'rgba(52, 211, 153, 0.25)' : 'var(--border)',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        {/* Muscle group dot */}
        <span
          aria-hidden="true"
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: color, flexShrink: 0,
          }}
        />

        {/* Body — clickable to expand */}
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={isExpanded}
          aria-label={`Expand details for ${exercise.exercise_name}`}
          style={{
            flex: 1, minWidth: 0, textAlign: 'left',
            background: 'none', border: 'none', padding: 0,
            color: 'inherit', fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          <p
            className="text-foreground"
            style={{
              fontSize: 14, fontWeight: 500, lineHeight: 1.25,
              textDecoration: exercise.completed ? 'line-through' : 'none',
              opacity: exercise.completed ? 0.7 : 1,
            }}
          >
            {exercise.exercise_name}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 2 }}>
            {exercise.sets_reps}
            {exercise.weight_used && <span style={{ marginLeft: 8, color: 'var(--primary)' }}>· {exercise.weight_used}</span>}
          </p>
        </button>

        {/* Round checkbox */}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={exercise.completed}
          aria-label={exercise.completed ? 'Mark as not done' : 'Mark as done'}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: exercise.completed ? '2px solid var(--success)' : '2px solid var(--border)',
            background: exercise.completed ? 'var(--success)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            transition: 'all 0.15s ease',
            padding: 0,
          }}
        >
          {exercise.completed && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0C0F14" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          {exercise.cue && (
            <div style={{ marginBottom: 12 }}>
              <p className="stat-label" style={{ fontSize: 9, marginBottom: 4 }}>Form Cue</p>
              <p className="text-muted-foreground" style={{ fontSize: 12, lineHeight: 1.5 }}>{exercise.cue}</p>
            </div>
          )}
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: 10, marginBottom: 12 }}>
            <div>
              <label className="form-label" style={{ marginBottom: 6 }}>Weight</label>
              <input
                type="text"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                onBlur={() => weight !== (exercise.weight_used || '') && onWeightChange(weight)}
                placeholder="140 lbs / lvl 8"
                className="form-input"
                style={{ padding: '8px 12px' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: 6 }}>Quick note</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                onBlur={() => note !== (exercise.note || '') && onNoteChange(note)}
                placeholder="Felt strong"
                className="form-input"
                style={{ padding: '8px 12px' }}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function RestDayCard({ date }) {
  return (
    <Card style={{ padding: 28, textAlign: 'center' }}>
      <p style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">🛌</p>
      <p className="text-foreground" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
        Rest day
      </p>
      <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
        Recover and recharge. A light walk, stretching, or mobility work is fine — but keep weights off the menu.
      </p>
      <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 14, opacity: 0.7 }}>
        {formatLongDate(date)}
      </p>
    </Card>
  )
}

function DoneCard({ count, note, onNoteChange }) {
  return (
    <Card
      style={{
        padding: 22,
        background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(43,181,196,0.08))',
        borderColor: 'rgba(52,211,153,0.25)',
      }}
    >
      <div className="flex items-center" style={{ gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 26 }} aria-hidden="true">🎉</span>
        <div>
          <p className="text-foreground" style={{ fontSize: 16, fontWeight: 700 }}>All done!</p>
          <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 2 }}>{count}/{count} complete · session logged</p>
        </div>
      </div>
      <textarea
        value={note}
        onChange={e => onNoteChange(e.target.value)}
        placeholder="How did it feel? (optional)"
        rows={2}
        className="form-input"
        style={{ resize: 'none', fontSize: 13 }}
      />
    </Card>
  )
}

function CelebrationToast({ onClose, count }) {
  useEffect(() => {
    toast.success(`Workout complete — ${count}/${count}! 🎉`, { duration: 3500 })
    onClose()
  }, [count, onClose])
  return null
}
