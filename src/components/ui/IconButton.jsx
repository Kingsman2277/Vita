// 44x44 is the minimum comfortable tap target; the mockup's sheet close
// button is 36, so `size` is overridable but defaults to the safe value.
export default function IconButton({ icon, label, size = 44, className = '', ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid place-items-center shrink-0 bg-card text-fg rounded-[12px] transition-opacity duration-150 active:opacity-70 ${className}`}
      style={{ width: size, height: size }}
      {...rest}
    >
      {icon}
    </button>
  )
}
