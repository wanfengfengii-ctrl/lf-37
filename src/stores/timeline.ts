import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CuePoint, TrackType, StagePosition } from '@/types'
import { useSceneStore } from './scene'
import { TRACK_ORDER } from '@/types'

const genId = () => Math.random().toString(36).slice(2, 10)

export const SNAP_GRID = 0.5

export function snapToGrid(time: number, grid: number = SNAP_GRID): number {
  return Math.round(time / grid) * grid
}

export const useTimelineStore = defineStore('timeline', () => {
  const sceneStore = useSceneStore()
  const selectedCueId = ref<string | null>(null)
  const timeScale = ref(1)
  const conflictCueIds = ref<Set<string>>(new Set())

  const currentCues = computed(() => sceneStore.currentScene?.cues ?? [])

  const sortedCues = computed(() =>
    [...currentCues.value].sort((a, b) => a.time - b.time)
  )

  const cuesByTrack = computed(() => {
    const map: Record<TrackType, CuePoint[]> = {
      character: [],
      lighting: [],
      sound: [],
      narration: [],
      backdrop: [],
    }
    for (const cue of currentCues.value) {
      map[cue.trackType].push(cue)
    }
    for (const t of TRACK_ORDER) {
      map[t].sort((a, b) => a.time - b.time)
    }
    return map
  })

  const selectedCue = computed(() =>
    currentCues.value.find((c) => c.id === selectedCueId.value) ?? null
  )

  watch(
    () => sceneStore.currentSceneId,
    () => {
      selectedCueId.value = null
      detectCharacterConflicts()
    }
  )

  watch(
    () => currentCues.value.map((c) => `${c.id}:${c.time}:${c.position}:${c.resourceId}`).join('|'),
    () => {
      detectCharacterConflicts()
    },
    { deep: true }
  )

  function addCue(partial: Partial<CuePoint> & { trackType: TrackType; time: number }) {
    const scene = sceneStore.currentScene
    if (!scene) return null
    const snappedTime = snapToGrid(partial.time)
    const cue: CuePoint = {
      id: genId(),
      sceneId: scene.id,
      trackType: partial.trackType,
      time: Math.max(0, Math.min(scene.duration, snappedTime)),
      resourceId: partial.resourceId ?? '',
      brightness: partial.brightness ?? (partial.trackType === 'lighting' ? 80 : 0),
      volume: partial.volume ?? (partial.trackType === 'sound' ? 70 : 0),
      narration: partial.narration ?? '',
      position: partial.position ?? 'center',
    }
    scene.cues.push(cue)
    ensureTimeOrder(cue.trackType)
    detectCharacterConflicts()
    return cue
  }

  function removeCue(id: string) {
    const scene = sceneStore.currentScene
    if (!scene) return
    const idx = scene.cues.findIndex((c) => c.id === id)
    if (idx > -1) {
      scene.cues.splice(idx, 1)
      if (selectedCueId.value === id) selectedCueId.value = null
      detectCharacterConflicts()
    }
  }

  function updateCue(id: string, patch: Partial<CuePoint>) {
    const cue = currentCues.value.find((c) => c.id === id)
    if (!cue) return
    Object.assign(cue, patch)
    if (patch.brightness !== undefined) {
      cue.brightness = Math.max(0, Math.min(100, cue.brightness))
    }
  }

  function updateCueTime(id: string, time: number, snap: boolean = true) {
    const cue = currentCues.value.find((c) => c.id === id)
    if (!cue) return
    const scene = sceneStore.currentScene
    if (!scene) return
    const newTime = snap ? snapToGrid(time) : time
    cue.time = Math.max(0, Math.min(scene.duration, newTime))
    ensureTimeOrder(cue.trackType)
    detectCharacterConflicts()
  }

  function ensureTimeOrder(trackType: TrackType) {
    const scene = sceneStore.currentScene
    if (!scene) return
    const trackCues = scene.cues
      .filter((c) => c.trackType === trackType)
      .sort((a, b) => a.time - b.time)
    for (let i = 1; i < trackCues.length; i++) {
      const prev = trackCues[i - 1].time
      const minNext = prev + SNAP_GRID
      if (trackCues[i].time < minNext) {
        trackCues[i].time = Math.min(scene.duration, minNext)
      }
    }
  }

  function detectCharacterConflicts() {
    const conflicts = new Set<string>()
    const charCues = currentCues.value
      .filter((c) => c.trackType === 'character' && c.resourceId)
      .sort((a, b) => a.time - b.time)

    const byCharacter = new Map<string, CuePoint[]>()
    for (const cue of charCues) {
      if (!byCharacter.has(cue.resourceId)) {
        byCharacter.set(cue.resourceId, [])
      }
      byCharacter.get(cue.resourceId)!.push(cue)
    }

    const EPSILON = 0.3
    const MIN_TRANSITION_TIME = 3.0

    for (const [, cues] of byCharacter) {
      const usedTimes = new Map<number, Set<StagePosition>>()
      for (const cue of cues) {
        const snappedTime = Math.round(cue.time * 2) / 2
        if (!usedTimes.has(snappedTime)) {
          usedTimes.set(snappedTime, new Set())
        }
        usedTimes.get(snappedTime)!.add(cue.position)
      }

      for (const [t, positions] of usedTimes) {
        if (positions.size > 1) {
          for (const cue of cues) {
            const cueSnapped = Math.round(cue.time * 2) / 2
            if (Math.abs(cueSnapped - t) < EPSILON) {
              conflicts.add(cue.id)
            }
          }
        }
      }

      for (let i = 0; i < cues.length; i++) {
        for (let j = i + 1; j < cues.length; j++) {
          const a = cues[i]
          const b = cues[j]
          if (Math.abs(a.time - b.time) < EPSILON) {
            if (a.position !== b.position) {
              conflicts.add(a.id)
              conflicts.add(b.id)
            }
          } else if (b.time - a.time < MIN_TRANSITION_TIME && a.position !== b.position) {
            let hasTransition = false
            for (let k = i + 1; k < j; k++) {
              if (cues[k].position === b.position) {
                hasTransition = true
                break
              }
              if (cues[k].position !== a.position) {
                hasTransition = true
                break
              }
            }
            if (!hasTransition) {
              conflicts.add(a.id)
              conflicts.add(b.id)
            }
          }
        }
      }
    }

    conflictCueIds.value = conflicts
  }

  function selectCue(id: string | null) {
    selectedCueId.value = id
  }

  function isCueInConflict(id: string) {
    return conflictCueIds.value.has(id)
  }

  function getPlaybackSequence() {
    return [...sortedCues.value]
  }

  return {
    selectedCueId,
    timeScale,
    conflictCueIds,
    currentCues,
    sortedCues,
    cuesByTrack,
    selectedCue,
    addCue,
    removeCue,
    updateCue,
    updateCueTime,
    ensureTimeOrder,
    detectCharacterConflicts,
    selectCue,
    isCueInConflict,
    getPlaybackSequence,
    snapToGrid,
    SNAP_GRID,
  }
})
