export type TrackType = 'character' | 'lighting' | 'sound' | 'narration' | 'backdrop'

export type ResourceType = 'character' | 'backdrop' | 'sound'

export type StagePosition = 'left' | 'center' | 'right' | 'upper' | 'lower'

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
