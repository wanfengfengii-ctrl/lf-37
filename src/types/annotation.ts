export type AnnotationType = 'director' | 'actor' | 'risk'

export type AnnotationStatus = 'pending' | 'in_progress' | 'resolved'

export type AnnotationPriority = 'low' | 'medium' | 'high' | 'critical'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface Annotation {
  id: string
  sceneId: string
  cueId?: string
  type: AnnotationType
  content: string
  status: AnnotationStatus
  priority: AnnotationPriority
  riskLevel?: RiskLevel
  assigneeId?: string
  deadline?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface AnnotationFilter {
  type?: AnnotationType | 'all'
  status?: AnnotationStatus | 'all'
  priority?: AnnotationPriority | 'all'
  assigneeId?: string | 'all'
  riskLevel?: RiskLevel | 'all'
  keyword?: string
}

export interface AnnotationStats {
  total: number
  pending: number
  inProgress: number
  resolved: number
  byPriority: Record<AnnotationPriority, number>
  byType: Record<AnnotationType, number>
  byAssignee: Record<string, number>
  overdue: number
  byRiskLevel: Record<RiskLevel, number>
}
