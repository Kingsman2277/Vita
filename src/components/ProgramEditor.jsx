import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'

// Mirrors the catalog used by the Workout page so the colors match.
const MUSCLE_OPTIONS = [
  { key: 'cardio', label: 'Cardio',  color: '#F97316' },
  { key: 'legs',   label: 'Legs',    color: '#A78BFA' },
  { key: 'push',   label: 'Push',    color: 'var(--info)' },
  { key: 'pull',   label: 'Pull',    color: 'var(--success)' },
  { key: 'arms',   label: 'Arms',    color: '#F472B6' },
]

const DOW_LABELS = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' }

/**
 * Modal for editing the user's per-day workout program. Day tabs
 * across the top, exercises listed below, add/edit/delete per row,
 * plus reset/clear actions at the bottom. All mutations go through
 * the `actions` prop so the parent owns the data fetch.
 */
export default function ProgramEditor({
  open, onClose,
  templates,
  actions, // { addProgramExercise, updateProgramExercise, deleteProgramExercise, resetProgramToDefaults, clearProgram }
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

  const handleReset = async () => {
    if (!confirm('Reset your program to the default 5-day full-body routine? Your current custom exercises will be replaced.')) return
    setBusy(true)
    try {
      await actions.resetProgramToDefaults()
      toast.success('Program reset to defaults')
      setEditingId(null)
    } catch (err) {
      toast.error(err.message || 'Could not reset')
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
      <div
        className="flex"
        style={{
          gap: 6, padding: 4, borderRadius: 12,
          background: 'var(--muted)', marginBottom: 16,
        }}
        role="tablist"
      >
        {[1, 2, 3, 4, 5].map(d => {
          const isActive = activeDay === d
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => { setActiveDay(d); setEditingId(null) }}
              style={{
                flex: 1, padding: '8px 0',
                borderRadius: 8, border: 'none',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {DOW_LABELS[d]}
            </button>
          )
        })}
      </div>

      {/* Exercise list */}
      <div className="flex flex-col" style={{ gap: 8, marginBottom: 14 }}>
        {dayExercises.length === 0 && editingId !== 'new' && (
          <div
            style={{
              padding: 18, borderRadius: 12, textAlign: 'center',
              border: '1px dashed var(--border)', background: 'var(--card)',
            }}
          >
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>
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
            <div
              key={t.id}
              style={{
                padding: '12px 14px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--card)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span
                aria-hidden="true"
                style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="text-foreground" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                  {t.exercise_name}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 2 }}>
                  {t.sets_reps}{t.cue ? ` · ${t.cue}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(t.id)}
                aria-label="Edit"
                style={{
                  padding: '6px 10px', fontSize: 11, fontWeight: 600,
                  borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--card)', color: 'var(--foreground)',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(t)}
                aria-label="Delete"
                disabled={busy}
                style={{
                  padding: '6px 10px', fontSize: 11, fontWeight: 600,
                  borderRadius: 8, border: '1px solid var(--danger)',
                  background: 'transparent', color: 'var(--danger)',
                  cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                ✕
              </button>
            </div>
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
        <button
          type="button"
          onClick={() => setEditingId('new')}
          className="btn-secondary w-full"
          style={{ padding: '10px 16px', marginBottom: 18 }}
        >
          + Add exercise to {DOW_LABELS[activeDay]}
        </button>
      )}

      {/* Footer actions */}
      <div style={{ marginTop: 8, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <p className="stat-label" style={{ marginBottom: 10 }}>Reset</p>
        <div className="flex" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={busy}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: 12, minWidth: 'auto', flex: 1, opacity: busy ? 0.5 : 1 }}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            style={{
              padding: '8px 14px', fontSize: 12,
              borderRadius: 8, border: '1px solid var(--danger)',
              background: 'transparent', color: 'var(--danger)', fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              flex: 1, opacity: busy ? 0.5 : 1,
            }}
          >
            Clear all
          </button>
        </div>
        <p className="text-hint" style={{ marginTop: 8 }}>
          Reset replaces your program with the standard 5-day routine. Clear wipes every day blank.
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
        background: 'rgba(43, 181, 196, 0.06)', border: '1px solid var(--primary)',
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
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          style={{ padding: '10px 16px', flex: 1, minWidth: 'auto' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary"
          style={{ padding: '10px 16px', flex: 1, minWidth: 'auto', opacity: busy ? 0.5 : 1 }}
        >
          {busy ? 'Saving…' : (initial ? 'Save changes' : 'Add exercise')}
        </button>
      </div>
    </form>
  )
}
