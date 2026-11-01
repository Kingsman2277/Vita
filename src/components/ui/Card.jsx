// Design "D" card: flat charcoal surface, 18px radius, no border, no shadow.
// Replaces ../Card.jsx screen by screen as the redesign phases land.
export default function Card({
  children,
  as: As = 'div',
  onClick,
  padding = 'md',
  className = '',
  style,
  ...rest
}) {
  const pad = padding === 'sm' ? 'px-[14px] py-3' : 'p-4'
  const base = `bg-card rounded-card ${pad} ${className}`

  // A clickable card is a real button, not a div with a handler — keyboard
  // users get it for free and screen readers announce it correctly.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} w-full text-left transition-transform duration-150 active:scale-[0.985]`}
        style={style}
        {...rest}
      >
        {children}
      </button>
    )
  }

  return (
    <As className={base} style={style} {...rest}>
      {children}
    </As>
  )
}
