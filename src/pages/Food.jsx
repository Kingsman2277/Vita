import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import CameraModal from '../components/CameraModal'
import MacroRing from '../components/MacroRing'
import SkeletonLoader from '../components/SkeletonLoader'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { analyzeFood } from '../lib/gemini'
import { getMealType } from '../lib/helpers'

export default function Food() {
  const { logs, todayCalories, todayProtein, todayCarbs, todayFat, loading, addFoodLog, deleteFoodLog } = useFoodLogs()
  const [modalOpen, setModalOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [form, setForm] = useState({ food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: getMealType() })
  const galleryRef = useRef()

  const handleCameraCapture = async (base64) => {
    setCameraOpen(false)
    setAnalyzing(true)
    setModalOpen(true)
    try {
      const result = await analyzeFood(base64)
      setForm({ food_name: result.food_name || '', calories: String(result.calories || ''), protein: String(result.protein_g || ''), carbs: String(result.carbs_g || ''), fat: String(result.fat_g || ''), meal_type: result.meal_type_guess || getMealType() })
    } catch { toast.error('Could not analyze photo. Enter manually.') }
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
    } catch { toast.error('Could not analyze photo. Enter manually.') }
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

  const groupedByDate = logs.reduce((acc, log) => {
    const date = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {})

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Food Log</h1>
        <div className="flex gap-2">
          <div className="relative">
            <button onClick={() => setPhotoMenuOpen(p => !p)} className="bg-muted border border-border text-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-accent transition-colors">
              📷 Photo
            </button>
            {photoMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPhotoMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[180px]">
                  <button
                    onClick={() => { setPhotoMenuOpen(false); setCameraOpen(true) }}
                    className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <span>📸</span> Take Photo
                  </button>
                  <div className="border-t border-border" />
                  <button
                    onClick={() => { setPhotoMenuOpen(false); galleryRef.current.value = ''; galleryRef.current?.click() }}
                    className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <span>🖼️</span> Upload from Gallery
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => { resetForm(); setModalOpen(true) }} className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-primary/80 transition-colors">
            + Log Food
          </button>
        </div>
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
      </div>

      {/* Today summary — hero treatment */}
      <div className="hero-card p-5">
        <p className="label text-[11px] font-semibold uppercase tracking-[0.1em] mb-3">Today</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold tracking-tight leading-none">{todayCalories}</p>
            <p className="label text-xs mt-1.5">calories</p>
          </div>
          <div className="flex gap-4">
            <MacroRing label="Protein" value={todayProtein} max={150} color="protein" />
            <MacroRing label="Carbs" value={todayCarbs} max={250} color="carbs" />
            <MacroRing label="Fat" value={todayFat} max={65} color="fat" />
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader count={4} />
      ) : Object.keys(groupedByDate).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🥗</div>
          <p className="empty-state-title">No food logged yet</p>
          <p className="empty-state-desc">Start tracking your meals to see calories and macros</p>
          <div className="flex gap-2">
            <button onClick={() => setCameraOpen(true)} className="bg-muted border border-border text-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-accent transition-colors">
              📸 Take Photo
            </button>
            <button onClick={() => { resetForm(); setModalOpen(true) }} className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/80 transition-colors">
              + Log Manually
            </button>
          </div>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date} className="space-y-2">
            <p className="stat-label">{date}</p>
            {items.map(item => (
              <Card key={item.id} className="p-4 flex items-center justify-between">
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
            <p className="text-sm text-muted-foreground">Analyzing photo...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <select value={form.meal_type} onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm">
              <option value="breakfast">🌅 Breakfast</option><option value="lunch">☀️ Lunch</option><option value="dinner">🌙 Dinner</option><option value="snack">🍿 Snack</option>
            </select>
            <input placeholder="Food name" value={form.food_name} onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))} className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm" required />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Calories" type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} className="bg-muted border border-border rounded-lg px-3 py-3 text-sm" required />
              <input placeholder="Protein (g)" type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} className="bg-muted border border-border rounded-lg px-3 py-3 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Carbs (g)" type="number" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} className="bg-muted border border-border rounded-lg px-3 py-3 text-sm" />
              <input placeholder="Fat (g)" type="number" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} className="bg-muted border border-border rounded-lg px-3 py-3 text-sm" />
            </div>
            <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/80 transition-colors">Save</button>
          </form>
        )}
      </Modal>

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
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
