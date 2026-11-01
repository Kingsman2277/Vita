export default function EmptyState({ icon, title, desc, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center py-12 px-6 ${className}`}>
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <p className="text-[17px] font-semibold text-fg">{title}</p>
      {desc && <p className="text-sm text-muted mt-1.5 max-w-[32ch]">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
