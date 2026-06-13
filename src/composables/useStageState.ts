import { ref, computed, type Ref } from 'vue'
import type { CuePoint, StagePosition, Resource } from '@/types'
import { getResourceById, describeCue, type ResourceNameMap } from '@/utils/resource-map'

export interface CharacterOnStage {
  resourceId: string
  name: string
  icon: string
  position: StagePosition
  cueId: string
}

export interface StageStateOptions {
  cues: Ref<CuePoint[]> | CuePoint[]
  resources: Ref<Resource[]> | Resource[]
  currentTime: Ref<number> | number
  conflictCueIds?: Ref<Set<string>> | Set<string>
}

export function useStageState(options: StageStateOptions) {
  const stageCharacters = ref<Map<string, CharacterOnStage>>(new Map())
  const currentBackdropId = ref<string>('')
  const currentBrightness = ref<number>(100)
  const currentNarration = ref<string>('')
  const narrationVisible = ref<boolean>(false)
  const conflictPositions = ref<Map<string, boolean>>(new Map())

  const stageCharacterList = computed(() => Array.from(stageCharacters.value.values()))

  const currentBackdrop = computed(() => {
    const resources = unrefWrap(options.resources)
    return currentBackdropId.value ? getResourceById(resources, currentBackdropId.value) : null
  })

  function computeStageState() {
    stageCharacters.value.clear()
    conflictPositions.value.clear()
    currentBackdropId.value = ''
    currentBrightness.value = 100
    currentNarration.value = ''
    narrationVisible.value = false

    const cues = unrefWrap(options.cues)
    const t = unrefWrap(options.currentTime)
    const sorted = [...cues].sort((a, b) => a.time - b.time)

    for (const cue of sorted) {
      if (cue.time <= t) {
        applyCueToStage(cue, false)
      }
    }

    detectStageConflicts()
  }

  function detectStageConflicts() {
    const conflictIds = unrefWrap(options.conflictCueIds)
    if (!conflictIds) return

    for (const ch of stageCharacters.value.values()) {
      if (conflictIds.has(ch.cueId)) {
        conflictPositions.value.set(ch.resourceId, true)
      }
    }
  }

  function applyCueToStage(cue: CuePoint, animate: boolean) {
    const resources = unrefWrap(options.resources)

    switch (cue.trackType) {
      case 'character': {
        const res = getResourceById(resources, cue.resourceId)
        if (res) {
          stageCharacters.value.set(cue.resourceId, {
            resourceId: cue.resourceId,
            name: res.name,
            icon: res.icon || '🎭',
            position: cue.position,
            cueId: cue.id,
          })
        }
        break
      }
      case 'backdrop': {
        if (cue.resourceId) {
          currentBackdropId.value = cue.resourceId
        }
        break
      }
      case 'lighting': {
        if (!animate) {
          currentBrightness.value = cue.brightness
        }
        break
      }
    }
  }

  return {
    stageCharacters,
    stageCharacterList,
    currentBackdropId,
    currentBackdrop,
    currentBrightness,
    currentNarration,
    narrationVisible,
    conflictPositions,
    computeStageState,
    applyCueToStage,
  }
}

function unrefWrap<T>(val: Ref<T> | T): T {
  return (val as Ref<T>).value !== undefined ? (val as Ref<T>).value : (val as T)
}
