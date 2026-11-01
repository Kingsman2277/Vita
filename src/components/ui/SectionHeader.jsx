export default function SectionHeader({ title, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h2 className="text-[17px] font-semibold text-fg">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-bold uppercase tracking-[0.08em] text-accent"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
