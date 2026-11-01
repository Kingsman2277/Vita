import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { BottomSheet as Modal, Button, Card } from './ui'

// Mirrors the catalog used by the Workout page so the colors match.
const MUSCLE_OPTIONS = [
  { key: 'cardio', label: 'Cardio',  color: '#F97316' },
  { key: 'legs',   label: 'Legs',    color: '#A78BFA' },
  { key: 'push',   label: 'Push',    color: 'var(--info)' },
  { key: 'pull',   label: 'Pull',    color: 'var(--success)' },
  { key: 'arms',   label: 'Arms',    color: '#F472B6' },
]

const DOW_LABELS = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

/**
 * Modal for editing the user's per-day workout program. Day tabs
 * across the top, exercises listed below, add/edit/delete per row,
 * plus reset/clear actions at the bottom. All mutations go through
 * the `actions` prop so the parent owns the data fetch.
 */
export default function ProgramEditor({
  open, onClose,
  templates,
  actions, // { addProgramExercise, updateProgramExercise, deleteProgramExercise, clearProgram, clearProgramForDay }
}) {
  const [activeDay, setActiveDay] = useState(1)
  const [editingId, setEditingId] = useState(null) // template id being edited (or 'new')
  const [busy, setBusy] = useState(false)

  const dayExercises = useMemo(
    () => templates
      .filter(t => t.day_of_week === activeDay)
      .sort((a, b) => a.exercise_order - b.exercise_order),
    [templates, activeDay]
  )

  const handleDelete = async (template) => {
    if (!confirm(`Delete "${template.exercise_name}" from ${DOW_LABELS[activeDay]}?`)) return
    setBusy(true)
    try {
      await actions.deleteProgramExercise(template.id)
      toast.success('Exercise removed')
    } catch (err) {
      toast.error(err.message || 'Could not delete')
    }
    setBusy(false)
  }

  const handleClearDay = async () => {
    if (dayExercises.length === 0) return
    if (!confirm(`Delete ALL ${dayExercises.length} exercises from ${DOW_LABELS[activeDay]}? You can add new ones after, or reset to defaults.`)) return
    setBusy(true)
    try {
      await actions.clearProgramForDay(activeDay)
      toast.success(`${DOW_LABELS[activeDay]} cleared`)
      setEditingId(null)
    } catch (err) {
      toast.error(err.message || 'Could not clear day')
    }
    setBusy(false)
  }

  const handleClear = async () => {
    if (!confirm("Clear ALL exercises across every day? You'll start from a blank slate — add exercises one at a time, or hit Reset to restore the default program.")) return
    setBusy(true)
    try {
      await actions.clearProgram()
      toast.success('Program cleared')
      setEditingId(null)
    } catch (err) {
      toast.error(err.message || 'Could not clear')
    }
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Workout Program">
      {/* Day tabs */}
      <div className="flex gap-1 p-1 rounded-[12px] bg-seg-track mb-4" role="tablist">
        {ALL_DAYS.map(d => {
          const isActive = activeDay === d
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => { setActiveDay(d); setEditingId(null) }}
              className={`flex-1 min-w-0 h-9 rounded-[9px] text-[11px] font-bold transition-colors ${
                isActive ? 'bg-white-btn text-bg' : 'text-fg-2'
              }`}
            >
              {DOW_LABELS[d]}
            </button>
          )
        })}
      </div>

      {/* Exercise list */}
      <div className="flex flex-col" style={{ gap: 8, marginBottom: 14 }}>
        {dayExercises.length === 0 && editingId !== 'new' && (
          <div className="py-5 px-4 rounded-[14px] text-center border border-dashed border-line bg-card">
            <p className="text-[13px] text-muted">
              No exercises for {DOW_LABELS[activeDay]} yet. Add one below.
            </p>
          </div>
        )}

        {dayExercises.map(t => {
          if (editingId === t.id) {
            return (
              <ExerciseForm
                key={t.id}
                initial={t}
                busy={busy}
                onCancel={() => setEditingId(null)}
                onSave={async (fields) => {
                  setBusy(true)
                  try {
                    await actions.updateProgramExercise(t.id, fields)
                    toast.success('Saved')
                    setEditingId(null)
                  } catch (err) {
                    toast.error(err.message || 'Could not save')
                  }
                  setBusy(false)
                }}
              />
            )
          }
          const color = MUSCLE_OPTIONS.find(m => m.key === t.muscle_group)?.color || 'var(--muted-foreground)'
          return (
            <Card key={t.id} padding="sm" className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-fg leading-tight">{t.exercise_name}</p>
                <p className="text-[11px] text-muted mt-0.5 truncate">
                  {t.sets_reps}{t.cue ? ` · ${t.cue}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(t.id)}
                aria-label={`Edit ${t.exercise_name}`}
                className="relative shrink-0 h-8 px-2.5 rounded-[8px] bg-card-2 text-fg text-[11px] font-semibold"
              >
                <span aria-hidden="true" className="absolute inset-x-0 -inset-y-2" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(t)}
                aria-label={`Delete ${t.exercise_name}`}
                disabled={busy}
                className="relative shrink-0 h-8 px-2.5 rounded-[8px] text-danger text-[11px] font-semibold disabled:opacity-50"
              >
                <span aria-hidden="true" className="absolute inset-x-0 -inset-y-2" />
                ✕
              </button>
            </Card>
          )
        })}

        {editingId === 'new' && (
          <ExerciseForm
            initial={null}
            busy={busy}
            onCancel={() => setEditingId(null)}
            onSave={async (fields) => {
              setBusy(true)
              try {
                await actions.addProgramExercise(activeDay, fields)
                toast.success('Exercise added')
                setEditingId(null)
              } catch (err) {
                toast.error(err.message || 'Could not add')
              }
              setBusy(false)
            }}
          />
        )}
      </div>

      {editingId !== 'new' && (
        <div className="flex flex-col" style={{ gap: 8, marginBottom: 18 }}>
          <Button variant="secondary" size="md" full onClick={() => setEditingId('new')}>
            + Add exercise to {DOW_LABELS[activeDay]}
          </Button>
          {dayExercises.length > 0 && (
            <button
              type="button"
              onClick={handleClearDay}
              disabled={busy}
              className="w-full min-h-[44px] text-[13px] font-semibold text-danger disabled:opacity-50"
            >
              Delete all from {DOW_LABELS[activeDay]}
            </button>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-2 pt-3.5 border-t border-divider">
        <button
          type="button"
          onClick={handleClear}
          disabled={busy}
          className="w-full min-h-[44px] text-[13px] font-semibold text-danger disabled:opacity-50"
        >
          Clear all days
        </button>
        <p className="text-hint" style={{ marginTop: 8 }}>
          Wipes every day blank. Past workout history (completed exercises) stays put.
        </p>
      </div>
    </Modal>
  )
}

function ExerciseForm({ initial, busy, onSave, onCancel }) {
  const [form, setForm] = useState({
    exercise_name: initial?.exercise_name || '',
    sets_reps: initial?.sets_reps || '3 x 10',
    cue: initial?.cue || '',
    muscle_group: initial?.muscle_group || 'arms',
  })
  const submit = (e) => {
    e.preventDefault()
    if (!form.exercise_name.trim()) {
      toast.error('Name is required')
      return
    }
    onSave(form)
  }
  return (
    <form
      onSubmit={submit}
      style={{
        padding: 14, borderRadius: 12,
        background: 'rgb(255 90 31 / 0.06)', border: '1px solid var(--color-accent)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div>
        <label className="form-label" style={{ marginBottom: 4 }}>Exercise name</label>
        <input
          autoFocus
          value={form.exercise_name}
          onChange={e => setForm(f => ({ ...f, exercise_name: e.target.value }))}
          className="form-input"
          placeholder="e.g. Leg Press"
        />
      </div>
      <div className="flex" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="form-label" style={{ marginBottom: 4 }}>Sets / Reps</label>
          <input
            value={form.sets_reps}
            onChange={e => setForm(f => ({ ...f, sets_reps: e.target.value }))}
            className="form-input"
            placeholder="3 x 12"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label" style={{ marginBottom: 4 }}>Muscle group</label>
          <select
            value={form.muscle_group}
            onChange={e => setForm(f => ({ ...f, muscle_group: e.target.value }))}
            className="form-input"
          >
            {MUSCLE_OPTIONS.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="form-label" style={{ marginBottom: 4 }}>Form cue (optional)</label>
        <input
          value={form.cue}
          onChange={e => setForm(f => ({ ...f, cue: e.target.value }))}
          className="form-input"
          placeholder="e.g. Control the negative — 3 seconds down"
        />
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 4 }}>
        <Button variant="secondary" size="md" full onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="md" full disabled={busy}>
          {busy ? 'Saving…' : (initial ? 'Save changes' : 'Add exercise')}
        </Button>
      </div>
    </form>
  )
}
