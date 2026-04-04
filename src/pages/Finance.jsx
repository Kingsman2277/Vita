import { useState } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import SkeletonLoader from '../components/SkeletonLoader'
import { useExpenses } from '../hooks/useExpenses'
import { formatCurrency, formatDate, getToday, EXPENSE_CATEGORIES, getCategoryEmoji } from '../lib/helpers'

export default function Finance() {
  const { expenses, loading, addExpense, deleteExpense, monthlyTotal } = useExpenses()
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ amount: '', category: 'food', note: '', date: getToday() })

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.category === filter)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return
    try {
      await addExpense({ amount: Number(form.amount), category: form.category, note: form.note || null, date: form.date })
      toast.success('Expense added!')
      setModalOpen(false)
      setForm({ amount: '', category: 'food', note: '', date: getToday() })
    } catch { toast.error('Failed to save') }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Finance</h1>
          <p className="text-muted-foreground text-sm mt-1">This month: <span className="text-foreground font-semibold">{formatCurrency(monthlyTotal)}</span></p>
        </div>
        <button onClick={() => setModalOpen(true)} className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-primary/80 transition-colors">+ Expense</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
        {EXPENSE_CATEGORIES.map(c => (
          <FilterChip key={c.value} label={`${c.emoji} ${c.label}`} active={filter === c.value} onClick={() => setFilter(c.value)} />
        ))}
      </div>

      {loading ? (
        <SkeletonLoader count={5} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💰</div>
          <p className="empty-state-title">No expenses yet</p>
          <p className="empty-state-desc">Start tracking your spending to see where your money goes</p>
          <button onClick={() => setModalOpen(true)} className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/80 transition-colors">
            Add your first expense
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <Card key={exp.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl w-9 h-9 flex items-center justify-center rounded-lg bg-muted flex-shrink-0">{getCategoryEmoji(exp.category)}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate text-foreground">{exp.note || exp.category}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(exp.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="font-semibold text-foreground">{formatCurrency(exp.amount)}</p>
                <button onClick={() => deleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="stat-label">Amount</label>
            <input placeholder="0.00" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-2xl font-bold text-center mt-2" required autoFocus />
          </div>
          <div>
            <label className="stat-label">Category</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {EXPENSE_CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, category: c.value }))}
                  className={`p-3 rounded-lg border text-center transition-all duration-200 ${form.category === c.value ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-muted text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
                  <span className="text-lg">{c.emoji}</span>
                  <p className="text-xs mt-1 font-medium">{c.label}</p>
                </button>
              ))}
            </div>
          </div>
          <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm" />
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm" />
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/80 transition-colors">Save Expense</button>
        </form>
      </Modal>
    </div>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${active ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
      {label}
    </button>
  )
}
