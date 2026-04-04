export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`glass-card ${onClick ? 'cursor-pointer active:scale-[0.98] transition-all duration-200 hover:border-primary/30' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
