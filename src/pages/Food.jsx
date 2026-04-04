import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import CameraModal from '../components/CameraModal'
import MacroRing from '../components/MacroRing'
import SkeletonLoader from '../components/SkeletonLoader'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import DayPicker from '../components/DayPicker'
import { filterByMonth, filterByDay, getDaysWithData } from '../lib/dateFilters'
import { analyzeFood, analyzeFoodText } from '../lib/gemini'
import { getMealType } from '../lib/helpers'

export default function Food() {
  const { logs, todayCalories, todayProtein, todayCarbs, todayFat, loading, addFoodLog, deleteFoodLog } = useFoodLogs()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const [modalOpen, setModalOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [smartText, setSmartText] = useState('')
  const [form, setForm] = useState({ food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: getMealType() })
  const [selectedDay, setSelectedDay] = useState(new Date().getDate()) // default to today
  const galleryRef = useRef()

  const handleSmartAnalyze = async () => {
    if (!smartText.trim()) return
    setAnalyzing(true)
    try {
      const result = await analyzeFoodText(smartText.trim())
      setForm({
        food_name: result.food_name || smartText.trim(),
        calories: String(result.calories || ''),
        protein: String(result.protein_g || ''),
        carbs: String(result.carbs_g || ''),
        fat: String(result.fat_g || ''),
        meal_type: result.meal_type_guess || getMealType(),
      })
      setSmartText('')
    } catch (err) {
      console.error('AI analyze error:', err)
      toast.error(err.message || 'Could not analyze. Fill in manually below.')
    }
    setAnalyzing(false)
  }

  // Filter logs: month → day
  const monthLogs = filterByMonth(logs, selectedMonth.year, selectedMonth.month, 'logged_at')
  const dayLogs = filterByDay(monthLogs, selectedDay, 'logged_at')
  const foodDaysWithData = getDaysWithData(monthLogs, 'logged_at')

  // Reset day selection when month changes
  const monthKey = `${selectedMonth.year}-${selectedMonth.month}`
  const [prevMonthKey, setPrevMonthKey] = useState(monthKey)
  if (monthKey !== prevMonthKey) { setPrevMonthKey(monthKey); setSelectedDay(null) }

  // Stats for the hero card (scoped to day if selected, else month)
  const statsLogs = selectedDay !== null ? dayLogs : monthLogs
  const statCalories = statsLogs.reduce((s, l) => s + Number(l.calories || 0), 0)
  const statProtein = statsLogs.reduce((s, l) => s + Number(l.protein || 0), 0)
  const statCarbs = statsLogs.reduce((s, l) => s + Number(l.carbs || 0), 0)
  const statFat = statsLogs.reduce((s, l) => s + Number(l.fat || 0), 0)
  const daysWithLogs = new Set(monthLogs.map(l => new Date(l.logged_at).toDateString())).size
  const avgDailyCalories = daysWithLogs > 0 ? Math.round(statCalories / daysWithLogs) : 0

  const handleCameraCapture = async (base64) => {
    setCameraOpen(false)
    setAnalyzing(true)
    setModalOpen(true)
    try {
      const result = await analyzeFood(base64)
      setForm({ food_name: result.food_name || '', calories: String(result.calories || ''), protein: String(result.protein_g || ''), carbs: String(result.carbs_g || ''), fat: String(result.fat_g || ''), meal_type: result.meal_type_guess || getMealType() })
    } catch (err) { console.error('Photo analyze error:', err); toast.error(err.message || 'Could not analyze photo.') }
    setAnalyzing(false)
  }

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzing(true)
    setModalOpen(true)
    try {
      const base64 = await fileToBase64(file)
      const result = await analyzeFood(base64)
      setForm({ food_name: result.food_name || '', calories: String(result.calories || ''), protein: String(result.protein_g || ''), carbs: String(result.carbs_g || ''), fat: String(result.fat_g || ''), meal_type: result.meal_type_guess || getMealType() })
    } catch (err) { console.error('Photo analyze error:', err); toast.error(err.message || 'Could not analyze photo.') }
    setAnalyzing(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.food_name || !form.calories) return
    try {
      await addFoodLog({ food_name: form.food_name, calories: Number(form.calories), protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0, meal_type: form.meal_type })
      toast.success('Food logged!')
      setModalOpen(false)
      resetForm()
    } catch { toast.error('Failed to save') }
  }

  const resetForm = () => setForm({ food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: getMealType() })

  // Group month-filtered logs by date
  const groupedByDate = dayLogs.reduce((acc, log) => {
    const date = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {})

  return (
    <div className="page-container">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="page-title">Food Log</h1>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="relative">
            <button onClick={() => setPhotoMenuOpen(p => !p)} className="btn-secondary" style={{ padding: '10px 18px', borderRadius: 20, minWidth: 'auto', fontSize: 13 }}>
              📷 Photo
            </button>
            {photoMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPhotoMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]" style={{ padding: '4px 0' }}>
                  <button onClick={() => { setPhotoMenuOpen(false); setCameraOpen(true) }} className="w-full text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span>📸</span> Take Photo
                  </button>
                  <div className="border-t border-border" />
                  <button onClick={() => { setPhotoMenuOpen(false); galleryRef.current.value = ''; galleryRef.current?.click() }} className="w-full text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span>🖼️</span> Upload from Gallery
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => { resetForm(); setModalOpen(true) }} className="btn-primary" style={{ padding: '10px 18px', borderRadius: 20, minWidth: 'auto', fontSize: 13 }}>
            + Log Food
          </button>
        </div>
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
      </div>

      <MonthPicker label={label} onPrev={() => { goToPrev(); setSelectedDay(null) }} onNext={() => { goToNext(); setSelectedDay(null) }} onToday={() => { goToCurrentMonth(); setSelectedDay(new Date().getDate()) }} isCurrentMonth={isCurrentMonth} />

      <DayPicker year={selectedMonth.year} month={selectedMonth.month} selectedDay={selectedDay} onSelectDay={setSelectedDay} daysWithData={foodDaysWithData} />

      {/* Hero card — shows stats for selected scope */}
      <div className="hero-card" style={{ padding: 24 }}>
        <p className="label text-[11px] font-semibold uppercase tracking-[0.1em] mb-3">
          {selectedDay !== null
            ? new Date(selectedMonth.year, selectedMonth.month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            : isCurrentMonth ? 'Today' : label}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold tracking-tight leading-none" style={{ fontSize: 42 }}>
              {selectedDay !== null || !isCurrentMonth ? statCalories.toLocaleString() : todayCalories}
            </p>
            <p className="label text-xs mt-1.5">
              {selectedDay !== null ? 'calories' : isCurrentMonth ? 'calories' : `total calories · ~${avgDailyCalories}/day avg`}
            </p>
          </div>
          <div className="flex" style={{ gap: 20 }}>
            <MacroRing label="Protein" value={selectedDay !== null || !isCurrentMonth ? statProtein : todayProtein} max={150} color="protein" />
            <MacroRing label="Carbs" value={selectedDay !== null || !isCurrentMonth ? statCarbs : todayCarbs} max={250} color="carbs" />
            <MacroRing label="Fat" value={selectedDay !== null || !isCurrentMonth ? statFat : todayFat} max={65} color="fat" />
          </div>
        </div>
        {selectedDay === null && !isCurrentMonth && (
          <p className="label text-[11px] mt-3">{daysWithLogs} day{daysWithLogs !== 1 ? 's' : ''} logged · {monthLogs.length} entries</p>
        )}
      </div>

      {loading ? (
        <SkeletonLoader count={4} />
      ) : Object.keys(groupedByDate).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🥗</div>
          <p className="empty-state-title">{isCurrentMonth ? 'No food logged yet' : `No food logged in ${label}`}</p>
          <p className="empty-state-desc">{isCurrentMonth ? 'Start tracking your meals to see calories and macros' : 'Try navigating to a different month'}</p>
          {isCurrentMonth && (
            <div className="flex gap-2">
              <button onClick={() => setCameraOpen(true)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>
                📸 Take Photo
              </button>
              <button onClick={() => { resetForm(); setModalOpen(true) }} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>
                + Log Manually
              </button>
            </div>
          )}
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date} className="flex flex-col" style={{ gap: 12 }}>
            <p className="stat-label">{date}</p>
            {items.map(item => (
              <Card key={item.id} className="flex items-center justify-between" style={{ padding: '14px 16px' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold uppercase tracking-wider">{item.meal_type}</span>
                    <p className="font-medium text-sm truncate text-foreground">{item.food_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{item.calories} cal &middot; {item.protein}p &middot; {item.carbs}c &middot; {item.fat}f</p>
                </div>
                <button onClick={() => deleteFoodLog(item.id)} className="text-muted-foreground hover:text-destructive ml-3 p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </Card>
            ))}
          </div>
        ))
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Food">
        {analyzing ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing your meal...</p>
          </div>
        ) : (
          <>
            {/* Smart AI input */}
            <div style={{ marginBottom: 28 }}>
              <label className="form-label">Describe what you ate</label>
              <textarea
                value={smartText}
                onChange={e => setSmartText(e.target.value)}
                placeholder="e.g. two eggs, two parathas, an apple, orange juice and a coffee"
                className="form-input"
                rows={3}
                style={{ resize: 'none', marginBottom: 12 }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmartAnalyze() } }}
              />
              <button
                type="button"
                onClick={handleSmartAnalyze}
                disabled={!smartText.trim()}
                className="btn-primary w-full"
                style={{ padding: '12px 24px', opacity: smartText.trim() ? 1 : 0.4 }}
              >
                ✨ Analyze with AI
              </button>
              <p className="text-hint">AI calculates calories & macros for you. Press Enter or click Analyze.</p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4" style={{ marginBottom: 24 }}>
              <div className="flex-1 border-t border-border" />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or enter manually</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Manual form */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Meal Type</label>
                <select value={form.meal_type} onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))} className="form-input">
                  <option value="breakfast">🌅 Breakfast</option><option value="lunch">☀️ Lunch</option><option value="dinner">🌙 Dinner</option><option value="snack">🍿 Snack</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Food Name</label>
                <input placeholder="Food name" value={form.food_name} onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))} className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Nutrition</label>
                <div className="form-row grid-cols-2">
                  <div>
                    <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Calories</label>
                    <input placeholder="0" type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} className="form-input" required />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Protein (g)</label>
                    <input placeholder="0" type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} className="form-input" />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <div className="form-row grid-cols-2">
                  <div>
                    <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Carbs (g)</label>
                    <input placeholder="0" type="number" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Fat (g)</label>
                    <input placeholder="0" type="number" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} className="form-input" />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" style={{ padding: '12px 24px' }}>Save</button>
            </form>
          </>
        )}
      </Modal>

      <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
    </div>
  )
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
