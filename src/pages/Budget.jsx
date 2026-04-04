import { useState } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import SkeletonLoader from '../components/SkeletonLoader'
import { useBudget } from '../hooks/useBudget'
import { useExpenses } from '../hooks/useExpenses'
import { formatCurrency } from '../lib/helpers'

export default function Budget() {
  const { budget, recurring, loading, saveBudget, addRecurring, deleteRecurring, totalRecurring, monthlyIncome, savingsTarget, discretionary } = useBudget()
  const { monthlyTotal } = useExpenses()
  const [editBudget, setEditBudget] = useState(false)
  const [addRecModal, setAddRecModal] = useState(false)
  const [incomeForm, setIncomeForm] = useState('')
  const [savingsForm, setSavingsForm] = useState('')
  const [recForm, setRecForm] = useState({ name: '', amount: '', day_of_month: '1', category: '' })

  const spentSoFar = monthlyTotal
  const canSpend = discretionary - spentSoFar

  const openEditBudget = () => {
    setIncomeForm(String(budget?.monthly_income || ''))
    setSavingsForm(String(budget?.savings_target || ''))
    setEditBudget(true)
  }

  const handleSaveBudget = async (e) => {
    e.preventDefault()
    try { await saveBudget({ monthly_income: Number(incomeForm), savings_target: Number(savingsForm) }); toast.success('Budget updated!'); setEditBudget(false) }
    catch { toast.error('Failed to save') }
  }

  const handleAddRecurring = async (e) => {
    e.preventDefault()
    try { await addRecurring({ name: recForm.name, amount: Number(recForm.amount), day_of_month: Number(recForm.day_of_month), category: recForm.category || null }); toast.success('Added!'); setAddRecModal(false); setRecForm({ name: '', amount: '', day_of_month: '1', category: '' }) }
    catch { toast.error('Failed to save') }
  }

  if (loading) return <div className="page-container"><SkeletonLoader count={5} height="h-28" /></div>

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Budget</h1>
        <button onClick={openEditBudget} className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors">Edit</button>
      </div>

      {/* Cash Flow — hero card */}
      <div className="hero-card p-6">
        <p className="label text-[11px] font-semibold uppercase tracking-[0.1em] mb-4">Cash Flow Summary</p>
        <div className="space-y-2.5">
          <FlowRow label="Monthly Income" value={formatCurrency(monthlyIncome)} color="text-emerald-400" />
          <FlowRow label="Recurring Expenses" value={`-${formatCurrency(totalRecurring)}`} color="text-red-400" />
          <FlowRow label="Savings Target" value={`-${formatCurrency(savingsTarget)}`} color="text-blue-400" />
          <div className="border-t border-white/10 pt-2.5">
            <FlowRow label="Discretionary Budget" value={formatCurrency(discretionary)} bold />
          </div>
          <FlowRow label="Spent So Far" value={`-${formatCurrency(spentSoFar)}`} color="text-orange-400" />
          <div className="border-t border-white/10 pt-2.5">
            <FlowRow label="You Can Spend" value={formatCurrency(canSpend)} color={canSpend >= 0 ? 'text-emerald-400' : 'text-red-400'} bold large />
          </div>
        </div>
      </div>

      {/* Recurring */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recurring Expenses</h2>
        <button onClick={() => setAddRecModal(true)} className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors">+ Add</button>
      </div>

      {recurring.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p className="empty-state-title">No recurring expenses</p>
          <p className="empty-state-desc">Add rent, subscriptions, and bills to track your fixed costs</p>
          <button onClick={() => setAddRecModal(true)} className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/80 transition-colors">
            Add recurring expense
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {recurring.map(r => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Day {r.day_of_month} of each month</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-sm text-foreground">{formatCurrency(r.amount)}</p>
                <button onClick={() => deleteRecurring(r.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={editBudget} onClose={() => setEditBudget(false)} title="Edit Budget">
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div><label className="stat-label">Monthly Income</label><input type="number" step="0.01" value={incomeForm} onChange={e => setIncomeForm(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm mt-2" required /></div>
          <div><label className="stat-label">Savings Target</label><input type="number" step="0.01" value={savingsForm} onChange={e => setSavingsForm(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm mt-2" required /></div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/80 transition-colors">Save</button>
        </form>
      </Modal>

      <Modal open={addRecModal} onClose={() => setAddRecModal(false)} title="Add Recurring Expense">
        <form onSubmit={handleAddRecurring} className="space-y-4">
          <input placeholder="Name (e.g. Rent)" value={recForm.name} onChange={e => setRecForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm" required />
          <input placeholder="Amount" type="number" step="0.01" value={recForm.amount} onChange={e => setRecForm(f => ({ ...f, amount: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm" required />
          <input placeholder="Day of month (1-31)" type="number" min="1" max="31" value={recForm.day_of_month} onChange={e => setRecForm(f => ({ ...f, day_of_month: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm" />
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/80 transition-colors">Add</button>
        </form>
      </Modal>
    </div>
  )
}

function FlowRow({ label, value, color, bold, large }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold' : 'opacity-70'}`}>{label}</span>
      <span className={`font-medium ${large ? 'text-xl font-bold' : 'text-sm'} ${bold ? 'font-bold' : ''} ${color || ''}`}>{value}</span>
    </div>
  )
}
