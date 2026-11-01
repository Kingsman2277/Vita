export default function TagPill({ children, tone = 'accent', icon, className = '' }) {
  const tones = {
    accent: 'bg-accent-soft text-accent',
    neutral: 'bg-[#26262A] text-fg-2',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  )
}
