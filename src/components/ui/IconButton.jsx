// The mockups draw some icon buttons smaller than the 44px minimum tap
// target (the sheet close is 36). Rather than redraw them, the visible
// box keeps its size and an invisible child stretches the hit area out to
// 44 — clicks on the child bubble to the button.
export default function IconButton({ icon, label, size = 44, className = '', ...rest }) {
  const overhang = Math.max(0, (44 - size) / 2)
  return (
    <button
      type="button"
      aria-label={label}
      className={`relative grid place-items-center shrink-0 bg-card text-fg rounded-[12px] transition-opacity duration-150 active:opacity-70 ${className}`}
      style={{ width: size, height: size }}
      {...rest}
    >
      {overhang > 0 && <span aria-hidden="true" className="absolute" style={{ inset: -overhang }} />}
      {icon}
    </button>
  )
}
