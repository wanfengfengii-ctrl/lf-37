import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick } from 'vue'
import { Howl } from 'howler'
import { useSceneStore } from './scene'
import { useTimelineStore } from './timeline'
import { useResourceStore } from './resource'
import type { CuePoint, StagePosition } from '@/types'

export interface CharacterOnStage {
  resourceId: string
  name: string
  icon: string
  position: StagePosition
  cueId: string
}

export const usePlaybackStore = defineStore('playback', () => {
  const sceneStore = useSceneStore()
  const timelineStore = useTimelineStore()
  const resourceStore = useResourceStore()

  const isPlaying = ref(false)
  const currentTime = ref(0)
  const playSpeed = ref(1)
  const activeCues = ref<Set<string>>(new Set())
  const soundInstances = ref<Map<string, Howl>>(new Map())
  let rafId: number | null = null
  let lastTimestamp = 0

  const stageCharacters = ref<Map<string, CharacterOnStage>>(new Map())
  const currentBackdropId = ref<string>('')
  const currentBrightness = ref<number>(100)
  const currentNarration = ref<string>('')
  const narrationVisible = ref<boolean>(false)
  const narrationTimer = ref<number | null>(null)
  const narrationDuration = ref<number>(5000)
  const narrationRemaining = ref<number>(0)
  const narrationStartTs = ref<number>(0)
  const drumFlash = ref<boolean>(false)
  const conflictPositions = ref<Map<string, boolean>>(new Map())
  let drumFlashTimer: number | null = null

  const totalDuration = computed(() => sceneStore.currentScene?.duration ?? 120)

  const playbackSequence = computed(() => timelineStore.getPlaybackSequence())

  const progressPercent = computed(() =>
    totalDuration.value > 0 ? (currentTime.value / totalDuration.value) * 100 : 0
  )

  const currentBackdrop = computed(() =>
    currentBackdropId.value ? resourceStore.getResourceById(currentBackdropId.value) : null
  )

  const stageCharacterList = computed(() => Array.from(stageCharacters.value.values()))

  function computeStageState() {
    stageCharacters.value.clear()
    conflictPositions.value.clear()
    currentBackdropId.value = ''
    currentBrightness.value = 100
    currentNarration.value = ''
    narrationVisible.value = false

    const seq = playbackSequence.value
    const t = currentTime.value

    for (const cue of seq) {
      if (cue.time <= t) {
        applyCueToStage(cue, false)
      }
    }

    detectStageConflicts()
  }

  function detectStageConflicts() {
    const posMap = new Map<string, string[]>()
    for (const ch of stageCharacters.value.values()) {
      if (!posMap.has(ch.position)) {
        posMap.set(ch.position, [])
      }
      posMap.get(ch.position)!.push(ch.resourceId)
    }

    for (const ch of stageCharacters.value.values()) {
      if (timelineStore.isCueInConflict(ch.cueId)) {
        conflictPositions.value.set(ch.resourceId, true)
      }
    }
  }

  function applyCueToStage(cue: CuePoint, animate: boolean) {
    switch (cue.trackType) {
      case 'character': {
        const res = resourceStore.getResourceById(cue.resourceId)
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
        if (animate) {
          const startBrightness = currentBrightness.value
          const targetBrightness = cue.brightness
          const duration = 500
          const startTime = performance.now()
          function animateBrightness(ts: number) {
            const elapsed = ts - startTime
            const progress = Math.min(1, elapsed / duration)
            const eased = 1 - Math.pow(1 - progress, 3)
            currentBrightness.value = Math.round(startBrightness + (targetBrightness - startBrightness) * eased)
            if (progress < 1) {
              requestAnimationFrame(animateBrightness)
            }
          }
          requestAnimationFrame(animateBrightness)
        } else {
          currentBrightness.value = cue.brightness
        }
        break
      }
      case 'narration': {
        if (cue.narration && animate) {
          showNarration(cue.narration)
        }
        break
      }
      case 'sound': {
        if (animate) {
          triggerDrumFlash()
        }
        break
      }
    }
  }

  function triggerDrumFlash() {
    drumFlash.value = true
    if (drumFlashTimer !== null) {
      window.clearTimeout(drumFlashTimer)
    }
    drumFlashTimer = window.setTimeout(() => {
      drumFlash.value = false
    }, 300)
  }

  watch(
    () => sceneStore.currentSceneId,
    () => {
      reset()
      nextTick(() => {
        computeStageState()
        triggerSequenceUpdate()
      })
    }
  )

  watch(
    () => timelineStore.sortedCues.map((c) => `${c.id}:${c.time}`).join('|'),
    () => {
      triggerSequenceUpdate()
    }
  )

  function triggerSequenceUpdate() {
    activeCues.value.clear()
    const seq = playbackSequence.value
    for (const cue of seq) {
      if (cue.time <= currentTime.value) {
        activeCues.value.add(cue.id)
      }
    }
    computeStageState()
  }

  function play() {
    if (totalDuration.value <= 0) return
    if (currentTime.value >= totalDuration.value) {
      currentTime.value = 0
      computeStageState()
    }
    isPlaying.value = true
    lastTimestamp = performance.now()
    resumeNarrationTimer()
    resumeAllSounds()
    tick(lastTimestamp)
  }

  function pause() {
    isPlaying.value = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    pauseNarrationTimer()
    pauseAllSounds()
  }

  function pauseAllSounds() {
    for (const howl of soundInstances.value.values()) {
      try {
        if (howl.playing()) {
          howl.pause()
        }
      } catch {}
    }
  }

  function resumeAllSounds() {
    for (const howl of soundInstances.value.values()) {
      try {
        if (!howl.playing()) {
          howl.play()
        }
      } catch {}
    }
  }

  function reset() {
    pause()
    currentTime.value = 0
    activeCues.value.clear()
    stopAllSounds()
    stageCharacters.value.clear()
    currentBackdropId.value = ''
    currentBrightness.value = 100
    currentNarration.value = ''
    narrationVisible.value = false
    narrationRemaining.value = 0
    if (narrationTimer.value !== null) {
      window.clearTimeout(narrationTimer.value)
      narrationTimer.value = null
    }
    drumFlash.value = false
    conflictPositions.value.clear()
  }

  function seek(time: number) {
    currentTime.value = Math.max(0, Math.min(totalDuration.value, time))
    activeCues.value.clear()
    const seq = playbackSequence.value
    for (const cue of seq) {
      if (cue.time <= currentTime.value) {
        activeCues.value.add(cue.id)
      }
    }
    computeStageState()
  }

  function tick(ts: number) {
    if (!isPlaying.value) return
    const delta = (ts - lastTimestamp) / 1000
    lastTimestamp = ts
    const prev = currentTime.value
    currentTime.value = Math.min(totalDuration.value, prev + delta * playSpeed.value)

    const seq = playbackSequence.value
    for (const cue of seq) {
      if (prev < cue.time && currentTime.value >= cue.time && !activeCues.value.has(cue.id)) {
        activeCues.value.add(cue.id)
        triggerCue(cue)
      }
    }

    if (currentTime.value >= totalDuration.value) {
      pause()
      currentTime.value = totalDuration.value
      computeStageState()
      window.setTimeout(() => {
        seek(0)
      }, 800)
      return
    }
    rafId = requestAnimationFrame(tick)
  }

  function triggerCue(cue: CuePoint) {
    applyCueToStage(cue, true)
    if (cue.trackType === 'sound') {
      playSound(cue)
    }
    if (cue.trackType === 'narration') {
      showNarration(cue.narration)
    }
  }

  function showNarration(text: string, duration: number = 5000) {
    if (!text) return
    currentNarration.value = text
    narrationVisible.value = true
    narrationDuration.value = duration
    narrationRemaining.value = duration
    narrationStartTs.value = performance.now()
    if (narrationTimer.value !== null) {
      window.clearTimeout(narrationTimer.value)
    }
    startNarrationTimer(duration)
  }

  function startNarrationTimer(remaining: number) {
    if (narrationTimer.value !== null) {
      window.clearTimeout(narrationTimer.value)
    }
    narrationStartTs.value = performance.now()
    narrationRemaining.value = remaining
    narrationTimer.value = window.setTimeout(() => {
      narrationVisible.value = false
      narrationRemaining.value = 0
    }, remaining)
  }

  function pauseNarrationTimer() {
    if (narrationTimer.value !== null && narrationVisible.value) {
      window.clearTimeout(narrationTimer.value)
      narrationTimer.value = null
      const elapsed = performance.now() - narrationStartTs.value
      narrationRemaining.value = Math.max(0, narrationRemaining.value - elapsed)
    }
  }

  function resumeNarrationTimer() {
    if (narrationVisible.value && narrationRemaining.value > 0) {
      startNarrationTimer(narrationRemaining.value)
    }
  }

  function playSound(cue: CuePoint) {
    try {
      if (soundInstances.value.has(cue.id)) {
        const existing = soundInstances.value.get(cue.id)
        if (existing) {
          existing.stop()
          soundInstances.value.delete(cue.id)
        }
      }

      const res = cue.resourceId ? resourceStore.getResourceById(cue.resourceId) : null
      let audioUrl = res?.audioUrl

      if (!audioUrl) {
        const defaultSounds: Record<string, string> = {
          '开场锣': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
          '急促鼓点': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
          '幕间钹': 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
          '战鼓': 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
          '收尾锣': 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3',
        }
        audioUrl = (res?.name && defaultSounds[res.name]) || 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
      }

      const howl = new Howl({
        src: [audioUrl],
        volume: Math.max(0, Math.min(1, (cue.volume ?? 70) / 100)),
        html5: true,
        onplay: () => {
          console.log(`[Sound] Playing: ${res?.name || 'default'} at volume ${cue.volume ?? 70}%`)
        },
        onend: () => {
          soundInstances.value.delete(cue.id)
        },
        onloaderror: (id, error) => {
          console.warn(`[Sound] Load error for ${res?.name || 'cue-' + cue.id}:`, error)
          soundInstances.value.delete(cue.id)
        },
        onplayerror: (id, error) => {
          console.warn(`[Sound] Play error for ${res?.name || 'cue-' + cue.id}:`, error)
          howl.once('unlock', () => howl.play())
        },
      })

      soundInstances.value.set(cue.id, howl)

      if (howl.state() === 'loaded') {
        howl.play()
      } else {
        howl.once('load', () => {
          if (soundInstances.value.has(cue.id)) {
            howl.play()
          }
        })
      }
    } catch (e) {
      console.warn('[Sound] Play failed:', e)
    }
  }

  function stopAllSounds() {
    for (const howl of soundInstances.value.values()) {
      try {
        howl.stop()
      } catch {}
    }
    soundInstances.value.clear()
  }

  function isCueActive(id: string) {
    return activeCues.value.has(id)
  }

  return {
    isPlaying,
    currentTime,
    playSpeed,
    activeCues,
    totalDuration,
    playbackSequence,
    progressPercent,
    stageCharacters,
    stageCharacterList,
    currentBackdropId,
    currentBackdrop,
    currentBrightness,
    currentNarration,
    narrationVisible,
    drumFlash,
    conflictPositions,
    play,
    pause,
    reset,
    seek,
    isCueActive,
    triggerSequenceUpdate,
    computeStageState,
    triggerCue,
    playSound,
    showNarration,
    triggerDrumFlash,
  }
})
