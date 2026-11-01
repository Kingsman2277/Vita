import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SegmentedControl from './ui/SegmentedControl'
import SkeletonLoader from './SkeletonLoader'
import Card from './Card'
import { useFeatures } from '../hooks/useFeatures'
import { visibleSegments } from '../lib/nav'

/**
 * Container for the Money and Body tabs (docs/redesign §5).
 *
 * Each segment maps onto one of the old standalone pages, so the shell
 * only owns the switcher — the page underneath keeps rendering its own
 * header and content until phases 4-6 rebuild it. That avoids stacking
 * two titles on every screen in the meantime.
 *
 * Segments the user has no feature for are filtered out, and an unknown
 * or disabled segment in the URL falls back to the first one they can
 * see rather than erroring.
 */
export default function SegmentShell({ base, segments, views }) {
  const { segment } = useParams()
  const navigate = useNavigate()
  const { hasFeature, loading } = useFeatures()

  if (loading) {
    return (
      <div className="page-container">
        <SkeletonLoader count={3} height="h-28" />
      </div>
    )
  }

  const available = visibleSegments(segments, hasFeature)

  if (available.length === 0) {
    return (
      <div className="page-container">
        <Card style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">🔒</p>
          <p className="text-foreground" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            Nothing enabled here yet
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Ask the admin to enable a feature for this tab.
          </p>
        </Card>
      </div>
    )
  }

  const active = available.find(s => s.value === segment)
  if (!active) return <Navigate to={`${base}/${available[0].value}`} replace />

  const View = views[active.value]

  return (
    <>
      {/* One segment is not a choice — hide the control rather than show
          a full-width button that does nothing. */}
      {available.length > 1 && (
        <div
          className="px-4 md:px-10"
          /* The switcher sits above .page-container, so it owns the notch
             inset on this screen. */
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <SegmentedControl
            value={active.value}
            onChange={value => navigate(`${base}/${value}`)}
            options={available.map(s => ({ value: s.value, label: s.label }))}
          />
        </div>
      )}
      <View />
    </>
  )
}
