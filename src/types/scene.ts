import type { CuePoint } from './cue'

export interface Scene {
  id: string
  sceneNumber: string
  performable: boolean
  duration: number
  cues: CuePoint[]
}

export interface ValidationError {
  rule: string
  message: string
  cueId?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
