// Shimmer runs card -> card-2 -> card. Honours prefers-reduced-motion by
// falling back to a flat block.
export default function Skeleton({ width = '100%', height = 16, radius = 8, className = '' }) {
  return (
    <div
      className={`bg-card motion-safe:animate-[ui-shimmer_1.4s_ease-in-out_infinite] ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundImage: 'linear-gradient(90deg, var(--color-card) 0%, var(--color-card-2) 50%, var(--color-card) 100%)',
        backgroundSize: '200% 100%',
      }}
      aria-hidden="true"
    />
  )
}
