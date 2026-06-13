import type { Scene, CuePoint, ValidationError, TrackType } from '@/types'
import { TRACK_ORDER, POSITION_LABELS } from '@/types'

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
  const EPSILON = 0.3
  const MIN_TRANSITION_TIME = 3.0
  const charCues = cues
    .filter((c) => c.trackType === 'character' && c.resourceId)
    .sort((a, b) => a.time - b.time)

  const byCharacter = new Map<string, CuePoint[]>()
  for (const cue of charCues) {
    if (!byCharacter.has(cue.resourceId)) {
      byCharacter.set(cue.resourceId, [])
    }
    byCharacter.get(cue.resourceId)!.push(cue)
  }

  for (const [, charCues] of byCharacter) {
    const usedTimes = new Map<number, Set<string>>()
    for (const cue of charCues) {
      const snappedTime = Math.round(cue.time * 2) / 2
      if (!usedTimes.has(snappedTime)) {
        usedTimes.set(snappedTime, new Set())
      }
      usedTimes.get(snappedTime)!.add(cue.position)
    }

    for (const [t, positions] of usedTimes) {
      if (positions.size > 1) {
        const posArr = Array.from(positions)
        errors.push({
          rule: 'R2',
          message: `角色在同一时刻 ${t.toFixed(1)}s 同时出现在 ${posArr.map(p => POSITION_LABELS[p as keyof typeof POSITION_LABELS]).join(' 和 ')}`,
        })
      }
    }

    for (let i = 0; i < charCues.length; i++) {
      for (let j = i + 1; j < charCues.length; j++) {
        const a = charCues[i]
        const b = charCues[j]
        if (Math.abs(a.time - b.time) < EPSILON) {
          if (a.position !== b.position) {
            errors.push({
              rule: 'R2',
              message: `角色在同一时刻 ${a.time.toFixed(1)}s 不能同时在 ${POSITION_LABELS[a.position]} 和 ${POSITION_LABELS[b.position]}`,
              cueId: a.id,
            })
            errors.push({
              rule: 'R2',
              message: `角色在同一时刻 ${b.time.toFixed(1)}s 不能同时在 ${POSITION_LABELS[b.position]} 和 ${POSITION_LABELS[a.position]}`,
              cueId: b.id,
            })
          }
        } else if (b.time - a.time < MIN_TRANSITION_TIME && a.position !== b.position) {
          let hasTransition = false
          for (let k = i + 1; k < j; k++) {
            if (charCues[k].position === b.position || charCues[k].position !== a.position) {
              hasTransition = true
              break
            }
          }
          if (!hasTransition) {
            errors.push({
              rule: 'R2',
              message: `角色在 ${a.time.toFixed(1)}s (${POSITION_LABELS[a.position]}) 到 ${b.time.toFixed(1)}s (${POSITION_LABELS[b.position]}) 间隔不足3秒，无法完成跨幕位移动`,
              cueId: a.id,
            })
            errors.push({
              rule: 'R2',
              message: `角色在 ${b.time.toFixed(1)}s (${POSITION_LABELS[b.position]}) 与前一位置 ${a.time.toFixed(1)}s (${POSITION_LABELS[a.position]}) 间隔不足3秒`,
              cueId: b.id,
            })
          }
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
