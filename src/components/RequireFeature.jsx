import { useNavigate } from 'react-router-dom'
import Card from './Card'
import SkeletonLoader from './SkeletonLoader'
import { useFeatures } from '../hooks/useFeatures'
import { FEATURE_CATALOG } from '../lib/features'

/**
 * Wraps a route element. While the feature set is loading, renders a
 * skeleton. If the current user doesn't have the required feature,
 * renders a friendly locked-state card with a "Back to Home" button.
 *
 * Why a card instead of a hard redirect: a redirect feels confusing
 * if the user navigated here on purpose. A "this feature isn't enabled
 * on your account, ask matteo to turn it on" card is informative and
 * actionable.
 */
export default function RequireFeature({ feature, children }) {
  const { hasFeature, loading } = useFeatures()

  if (loading) {
    return (
      <div className="page-container">
        <SkeletonLoader count={3} height="h-28" />
      </div>
    )
  }

  if (!hasFeature(feature)) {
    return <LockedCard feature={feature} />
  }

  return children
}

function LockedCard({ feature }) {
  const navigate = useNavigate()
  const meta = FEATURE_CATALOG.find(f => f.key === feature)
  return (
    <div className="page-container">
      <Card style={{ padding: 28, textAlign: 'center' }}>
        <p style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">🔒</p>
        <p className="text-foreground" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          {meta?.label || 'This feature'} isn't enabled on your account
        </p>
        <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 320, margin: '0 auto 18px' }}>
          {meta?.description ? `${meta.description}. ` : ''}
          Ask the admin to enable it for you.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
          style={{ padding: '10px 22px', minWidth: 'auto' }}
        >
          Back to Home
        </button>
      </Card>
    </div>
  )
}
