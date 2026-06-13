import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CuePoint, TrackType, StagePosition } from '@/types'
import { useSceneStore } from './scene'
import { TRACK_ORDER } from '@/types'

const genId = () => Math.random().toString(36).slice(2, 10)

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

  function addCue(partial: Partial<CuePoint> & { trackType: TrackType; time: number }) {
    const scene = sceneStore.currentScene
    if (!scene) return null
    const cue: CuePoint = {
      id: genId(),
      sceneId: scene.id,
      trackType: partial.trackType,
      time: partial.time,
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
    if (patch.time !== undefined || patch.position !== undefined) {
      detectCharacterConflicts()
    }
    if (patch.brightness !== undefined) {
      cue.brightness = Math.max(0, Math.min(100, cue.brightness))
    }
  }

  function updateCueTime(id: string, time: number) {
    const cue = currentCues.value.find((c) => c.id === id)
    if (!cue) return
    const scene = sceneStore.currentScene
    if (!scene) return
    cue.time = Math.max(0, Math.min(scene.duration, time))
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
      if (trackCues[i].time < trackCues[i - 1].time) {
        trackCues[i].time = trackCues[i - 1].time
      }
    }
  }

  function detectCharacterConflicts() {
    const conflicts = new Set<string>()
    const charCues = currentCues.value.filter((c) => c.trackType === 'character')
    for (let i = 0; i < charCues.length; i++) {
      for (let j = i + 1; j < charCues.length; j++) {
        const a = charCues[i]
        const b = charCues[j]
        if (a.resourceId && a.resourceId === b.resourceId && a.position === b.position) {
          const timeDiff = Math.abs(a.time - b.time)
          if (timeDiff < 3) {
            conflicts.add(a.id)
            conflicts.add(b.id)
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
  }
})
