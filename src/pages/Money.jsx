import SegmentShell from '../components/SegmentShell'
import { MONEY_SEGMENTS } from '../lib/nav'
import Finance from './Finance'
import Budget from './Budget'
import Summary from './Summary'

export default function Money() {
  return (
    <SegmentShell
      base="/money"
      segments={MONEY_SEGMENTS}
      views={{ expenses: Finance, budget: Budget, insights: Summary }}
    />
  )
}
