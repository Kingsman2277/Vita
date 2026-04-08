export default function Card({ children, className = '', onClick, style, ...rest }) {
  // When onClick is provided, render as a real button for accessibility
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`glass-card glass-button cursor-pointer active:scale-[0.98] transition-all duration-200 hover:border-primary/30 ${className}`}
        style={style}
        {...rest}
      >
        {children}
      </button>
    )
  }
  return (
    <div className={`glass-card ${className}`} style={style} {...rest}>
      {children}
    </div>
  )
}
