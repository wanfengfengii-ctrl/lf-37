import type { Scene, CuePoint, ValidationError, TrackType } from '@/types'
import { TRACK_ORDER } from '@/types'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export function validateSceneNumberUnique(
  scenes: Scene[],
  sceneId: string,
  number: string
): ValidationError | null {
  for (const s of scenes) {
    if (s.sceneNumber === number && s.id !== sceneId) {
      return {
        rule: 'R1',
        message: `场次编号 "${number}" 已存在，请使用唯一编号`,
      }
    }
  }
  return null
}

export function validateCharacterConflict(cues: CuePoint[]): ValidationError[] {
  const errors: ValidationError[] = []
  const charCues = cues.filter((c) => c.trackType === 'character')
  for (let i = 0; i < charCues.length; i++) {
    for (let j = i + 1; j < charCues.length; j++) {
      const a = charCues[i]
      const b = charCues[j]
      if (a.resourceId && a.resourceId === b.resourceId && a.position === b.position) {
        const timeDiff = Math.abs(a.time - b.time)
        if (timeDiff < 3) {
          errors.push({
            rule: 'R2',
            message: `角色在 ${a.time.toFixed(1)}s 和 ${b.time.toFixed(1)}s 于同一幕位冲突（间隔 <3s）`,
            cueId: a.id,
          })
          errors.push({
            rule: 'R2',
            message: `角色在 ${b.time.toFixed(1)}s 和 ${a.time.toFixed(1)}s 于同一幕位冲突（间隔 <3s）`,
            cueId: b.id,
          })
        }
      }
    }
  }
  return errors
}

export function validateCueTimeOrder(cues: CuePoint[]): ValidationError[] {
  const errors: ValidationError[] = []
  for (const track of TRACK_ORDER as TrackType[]) {
    const list = cues.filter((c) => c.trackType === track).sort((a, b) => a.time - b.time)
    for (let i = 1; i < list.length; i++) {
      if (list[i].time < list[i - 1].time) {
        errors.push({
          rule: 'R3',
          message: `${track} 轨道 cue 点时间不递增`,
          cueId: list[i].id,
        })
      }
    }
  }
  return errors
}

export function validateBrightness(cues: CuePoint[]): ValidationError[] {
  const errors: ValidationError[] = []
  for (const cue of cues.filter((c) => c.trackType === 'lighting')) {
    if (cue.brightness < 0 || cue.brightness > 100) {
      errors.push({
        rule: 'R4',
        message: `灯光亮度 ${cue.brightness} 超出范围 0-100`,
        cueId: cue.id,
      })
    }
  }
  return errors
}

export function validateSceneCompleteness(scene: Scene): ValidationError[] {
  const errors: ValidationError[] = []
  const hasSound = scene.cues.some((c) => c.trackType === 'sound')
  const hasBackdrop = scene.cues.some((c) => c.trackType === 'backdrop')
  if (!hasSound) {
    errors.push({ rule: 'R5', message: '场次缺少锣鼓音效' })
  }
  if (!hasBackdrop) {
    errors.push({ rule: 'R5', message: '场次缺少幕景切换' })
  }
  return errors
}

export function validateAll(scenes: Scene[], currentScene: Scene | undefined): ValidationResult {
  const errors: ValidationError[] = []
  for (const scene of scenes) {
    for (const other of scenes) {
      if (scene.id !== other.id && scene.sceneNumber === other.sceneNumber) {
        errors.push({
          rule: 'R1',
          message: `场次编号 "${scene.sceneNumber}" 重复`,
        })
        break
      }
    }
  }
  if (currentScene) {
    errors.push(...validateCharacterConflict(currentScene.cues))
    errors.push(...validateCueTimeOrder(currentScene.cues))
    errors.push(...validateBrightness(currentScene.cues))
    if (currentScene.performable) {
      errors.push(...validateSceneCompleteness(currentScene))
    }
  }
  return { valid: errors.length === 0, errors }
}
