import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CuePoint, TrackType } from '@/types'
import { TRACK_ORDER } from '@/types'
import { useSceneStore } from './scene'
import { genId } from '@/utils/id'
import { snapToGrid, SNAP_GRID, clampTime } from '@/utils/time'
import { groupCuesByTrack } from '@/utils/resource-map'
import { validateCharacterConflict } from '@/composables/useValidator'

export const useTimelineStore = defineStore('timeline', () => {
  const sceneStore = useSceneStore()

  const selectedCueId = ref<string | null>(null)
  const timeScale = ref(1)
  const conflictCueIds = ref<Set<string>>(new Set())

  const currentCues = computed(() => sceneStore.currentScene?.cues ?? [])

  const sortedCues = computed(() =>
    [...currentCues.value].sort((a, b) => a.time - b.time)
  )

  const cuesByTrack = computed(() =>
    groupCuesByTrack(currentCues.value, TRACK_ORDER as TrackType[])
  )

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

  function detectCharacterConflicts() {
    const errors = validateCharacterConflict(currentCues.value)
    const conflicts = new Set<string>()
    for (const err of errors) {
      if (err.cueId) {
        conflicts.add(err.cueId)
      }
    }
    conflictCueIds.value = conflicts
  }

  function addCue(partial: Partial<CuePoint> & { trackType: TrackType; time: number }) {
    const scene = sceneStore.currentScene
    if (!scene) return null

    const snappedTime = snapToGrid(partial.time)
    const cue: CuePoint = {
      id: genId(),
      sceneId: scene.id,
      trackType: partial.trackType,
      time: clampTime(snappedTime, 0, scene.duration),
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
    cue.time = clampTime(newTime, 0, scene.duration)
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
