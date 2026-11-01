import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AmountKeypad, BottomSheet, Button } from './ui'
import { useFeatures } from '../hooks/useFeatures'
import { useExpenses } from '../hooks/useExpenses'
import { useWeightLogs } from '../hooks/useWeightLogs'
import { EXPENSE_CATEGORIES, formatCurrency, getToday } from '../lib/helpers'

const LAST_TYPE_KEY = 'vita:quickadd:last-type'

// Expense and Weight are logged here. Food and Workout hand off to their
// own screens: the food form carries photo capture, AI analysis, servings
// and micronutrients, which belongs with that screen's rebuild in phase 5,
// and the data model has no free-form workout entry at all (§6.4).
const TYPES = [
  { value: 'expense', label: 'Expense', emoji: '💸', feature: 'finance' },
  { value: 'food',    label: 'Food',    emoji: '🍽️', feature: 'food' },
  { value: 'weight',  label: 'Weight',  emoji: '⚖️', feature: 'goals' },
  { value: 'workout', label: 'Workout', emoji: '💪', feature: 'workout' },
]

function TypeTiles({ types, value, onChange }) {
  return (
    <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: `repeat(${types.length}, minmax(0, 1fr))` }}>
      {types.map(t => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            aria-pressed={active}
            className={`h-[66px] rounded-[14px] flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
              active ? 'bg-white-btn text-bg' : 'bg-card-2 text-fg-2'
            }`}
          >
            <span className="text-lg" aria-hidden="true">{t.emoji}</span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full bg-card-2 rounded-[12px] px-3.5 text-fg min-h-[44px]'

function ExpenseForm({ onDone }) {
  const { addExpense } = useExpenses()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('groceries')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getToday())
  const [reimbursable, setReimbursable] = useState(false)
  const [saving, setSaving] = useState(false)

  const value = Number(amount) || 0

  const save = async () => {
    if (value <= 0) return toast.error('Enter an amount')
    setSaving(true)
    try {
      // `is_recurring` is the existing column name — it means "work
      // reimbursable", not a repeating expense (§6.2).
      await addExpense({ amount: value, category, note: note || null, date, is_recurring: reimbursable })
      toast.success('Expense logged')
      onDone()
    } catch (err) {
      toast.error(err.message || 'Could not save')
    }
    setSaving(false)
  }

  return (
    <>
      <p className="text-[46px] font-bold text-fg tabular-nums leading-none mb-5">
        <span className="text-[30px] text-muted">$</span>{amount || '0'}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {EXPENSE_CATEGORIES.map(c => {
          const active = c.value === category
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              aria-pressed={active}
              className={`relative h-9 px-3 rounded-[12px] text-[13px] font-semibold transition-colors ${
                active ? 'bg-accent-soft text-accent ring-1 ring-inset ring-accent' : 'bg-card-2 text-fg-2'
              }`}
            >
              {/* Chips are 36px tall by design (§4.3); this stretches the
                  hit area to 44 without changing how they look. */}
              <span aria-hidden="true" className="absolute inset-x-0 -inset-y-1" />
              {c.emoji} {c.label}
            </button>
          )
        })}
      </div>

      <Field label="Note">
        <input className={inputClass} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
      </Field>
      <Field label="Date">
        <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
      </Field>

      <button
        type="button"
        onClick={() => setReimbursable(v => !v)}
        role="switch"
        aria-checked={reimbursable}
        className="w-full flex items-center justify-between min-h-[44px] mb-4"
      >
        <span className="text-[15px] text-fg">Work reimbursable</span>
        <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${reimbursable ? 'bg-accent' : 'bg-card-2'}`}>
          <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${reimbursable ? 'translate-x-5' : ''}`} />
        </span>
      </button>

      <AmountKeypad value={amount} onChange={setAmount} className="mb-4" />

      <Button full disabled={saving || value <= 0} onClick={save}>
        {saving ? 'Saving…' : `Save expense · ${formatCurrency(value)}`}
      </Button>
    </>
  )
}

function WeightForm({ onDone }) {
  const { saveEntry } = useWeightLogs()
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(getToday())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const value = Number(weight) || 0

  const save = async () => {
    if (value <= 0) return toast.error('Enter a weight')
    setSaving(true)
    try {
      await saveEntry({ date, weight: value, note: note || null })
      toast.success('Weight logged')
      onDone()
    } catch (err) {
      toast.error(err.message || 'Could not save')
    }
    setSaving(false)
  }

  return (
    <>
      <p className="text-[46px] font-bold text-fg tabular-nums leading-none mb-5">
        {weight || '0'}<span className="text-[22px] text-muted ml-1.5">lb</span>
      </p>

      <Field label="Date">
        <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
      </Field>
      <Field label="Note">
        <input className={inputClass} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
      </Field>

      {/* One decimal: weights are logged to 0.1 lb. */}
      <AmountKeypad value={weight} onChange={setWeight} decimals={1} className="mb-4 mt-2" />

      <Button full disabled={saving || value <= 0} onClick={save}>
        {saving ? 'Saving…' : `Save weight · ${value || 0} lb`}
      </Button>
    </>
  )
}

function Shortcut({ emoji, title, desc, cta, onGo }) {
  return (
    <div className="text-center py-6">
      <p className="text-3xl mb-3" aria-hidden="true">{emoji}</p>
      <p className="text-[17px] font-semibold text-fg">{title}</p>
      <p className="text-sm text-muted mt-1.5 mb-6 mx-auto max-w-[32ch]">{desc}</p>
      <Button full onClick={onGo}>{cta}</Button>
    </div>
  )
}

export default function QuickAddSheet({ open, onClose }) {
  const { hasFeature } = useFeatures()
  const navigate = useNavigate()
  const types = TYPES.filter(t => hasFeature(t.feature))
  const [type, setType] = useState(null)

  // Reopen on whatever was used last, as long as it is still enabled.
  useEffect(() => {
    if (!open || types.length === 0) return
    setType(current => {
      if (current && types.some(t => t.value === current)) return current
      let remembered = null
      try { remembered = localStorage.getItem(LAST_TYPE_KEY) } catch { /* private mode */ }
      return types.some(t => t.value === remembered) ? remembered : types[0].value
    })
  }, [open, types])

  const pick = (value) => {
    setType(value)
    try { localStorage.setItem(LAST_TYPE_KEY, value) } catch { /* private mode */ }
  }

  const goTo = (path) => { onClose(); navigate(path) }

  if (types.length === 0) return null

  return (
    <BottomSheet open={open} onClose={onClose} title="Quick add">
      {types.length > 1 && <TypeTiles types={types} value={type} onChange={pick} />}

      {type === 'expense' && <ExpenseForm onDone={onClose} />}
      {type === 'weight' && <WeightForm onDone={onClose} />}
      {type === 'food' && (
        <Shortcut
          emoji="🍽️" title="Log food"
          desc="Photo, AI analyze and manual entry all live on the Food screen."
          cta="Open food log" onGo={() => goTo('/body/food')}
        />
      )}
      {type === 'workout' && (
        <Shortcut
          emoji="💪" title="Today's session"
          desc="Workouts are logged by ticking off today's program checklist."
          cta="Open training" onGo={() => goTo('/body/training')}
        />
      )}
    </BottomSheet>
  )
}
