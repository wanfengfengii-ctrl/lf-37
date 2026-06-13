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

export const TRACK_ORDER: TrackType[] = ['character', 'lighting', 'sound', 'narration', 'backdrop']
