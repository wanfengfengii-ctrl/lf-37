import type { TrackType, StagePosition } from './common'

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

export interface CueWithResourceName extends CuePoint {
  _resourceName?: string
}
