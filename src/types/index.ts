export type TrackType = 'character' | 'lighting' | 'sound' | 'narration' | 'backdrop'

export type ResourceType = 'character' | 'backdrop' | 'sound'

export type StagePosition = 'left' | 'center' | 'right' | 'upper' | 'lower'

export interface CuePoint {
  id: string
  sceneId: string
  trackType: TrackType
  time: number
  resourceId: string
  brightness: number
  volume: number
  narration: string
  position: StagePosition
}

export interface Scene {
  id: string
  sceneNumber: string
  performable: boolean
  duration: number
  cues: CuePoint[]
}

export interface Resource {
  id: string
  type: ResourceType
  name: string
  icon: string
  audioUrl: string
  imageUrl: string
}

export interface ValidationError {
  rule: string
  message: string
  cueId?: string
}

export const TRACK_LABELS: Record<TrackType, string> = {
  character: '角色',
  lighting: '灯光',
  sound: '锣鼓',
  narration: '旁白',
  backdrop: '幕景',
}

export const TRACK_COLORS: Record<TrackType, string> = {
  character: '#E74C3C',
  lighting: '#F1C40F',
  sound: '#E67E22',
  narration: '#2ECC71',
  backdrop: '#3498DB',
}

export const POSITION_LABELS: Record<StagePosition, string> = {
  left: '左幕位',
  center: '中幕位',
  right: '右幕位',
  upper: '上幕位',
  lower: '下幕位',
}

export type AnnotationType = 'director' | 'actor' | 'risk'

export type AnnotationStatus = 'pending' | 'in_progress' | 'resolved'

export type AnnotationPriority = 'low' | 'medium' | 'high' | 'critical'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
  color: string
}

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

export interface VersionSnapshot {
  id: string
  label: string
  description?: string
  scenes: Scene[]
  annotations: Annotation[]
  resourceNames: Record<string, string>
  createdAt: string
  createdBy?: string
  isLocked: boolean
  isMilestone: boolean
  frozenAnnotationIds: string[]
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

export interface PlaybackFilter {
  assigneeId?: string | 'all'
  riskLevel?: RiskLevel | 'all'
  showResolved: boolean
}

export interface VersionDiffItem {
  trackType: TrackType
  changeType: 'added' | 'removed' | 'modified'
  description: string
  cueId?: string
}

export const TRACK_ORDER: TrackType[] = ['character', 'lighting', 'sound', 'narration', 'backdrop']
