import type { RiskLevel } from './annotation'

export interface PlaybackFilter {
  assigneeId?: string | 'all'
  riskLevel?: RiskLevel | 'all'
  showResolved: boolean
}
