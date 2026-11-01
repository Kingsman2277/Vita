const VARIANTS = {
  primary: 'bg-white-btn text-bg font-bold',
  secondary: 'bg-card text-fg font-semibold',
  ghost: 'bg-transparent text-fg font-semibold',
}

const SIZES = {
  // 54px is the mockup's primary button height; md stays above the 44px
  // minimum tap target.
  lg: 'h-[54px] text-base rounded-[14px] px-5',
  md: 'h-[46px] text-[15px] rounded-[12px] px-4',
  sm: 'h-9 text-[13px] rounded-[10px] px-3',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'lg',
  full = false,
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`inline-grid place-items-center transition-opacity duration-150 active:opacity-80 disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
