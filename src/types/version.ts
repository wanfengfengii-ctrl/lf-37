import type { Scene } from './scene'
import type { Annotation } from './annotation'
import type { TrackType } from './common'

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

export interface VersionDiffItem {
  trackType: TrackType
  changeType: 'added' | 'removed' | 'modified'
  description: string
  cueId?: string
}
