import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { Howl } from 'howler'
import { useSceneStore } from './scene'
import { useTimelineStore } from './timeline'
import type { CuePoint } from '@/types'

export const usePlaybackStore = defineStore('playback', () => {
  const sceneStore = useSceneStore()
  const timelineStore = useTimelineStore()

  const isPlaying = ref(false)
  const currentTime = ref(0)
  const playSpeed = ref(1)
  const activeCues = ref<Set<string>>(new Set())
  const soundInstances = ref<Map<string, Howl>>(new Map())
  let rafId: number | null = null
  let lastTimestamp = 0

  const totalDuration = computed(() => sceneStore.currentScene?.duration ?? 120)

  const playbackSequence = computed(() => timelineStore.getPlaybackSequence())

  const progressPercent = computed(() =>
    totalDuration.value > 0 ? (currentTime.value / totalDuration.value) * 100 : 0
  )

  watch(
    () => timelineStore.sortedCues.map((c) => `${c.id}:${c.time}`).join('|'),
    () => {
      triggerSequenceUpdate()
    }
  )

  function triggerSequenceUpdate() {
    if (!isPlaying.value) return
    activeCues.value.clear()
    const seq = playbackSequence.value
    for (const cue of seq) {
      if (cue.time <= currentTime.value) {
        activeCues.value.add(cue.id)
      }
    }
  }

  function play() {
    if (totalDuration.value <= 0) return
    if (currentTime.value >= totalDuration.value) {
      currentTime.value = 0
    }
    isPlaying.value = true
    lastTimestamp = performance.now()
    tick(lastTimestamp)
  }

  function pause() {
    isPlaying.value = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function reset() {
    pause()
    currentTime.value = 0
    activeCues.value.clear()
    stopAllSounds()
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
      return
    }
    rafId = requestAnimationFrame(tick)
  }

  function triggerCue(cue: CuePoint) {
    if (cue.trackType === 'sound') {
      playSound(cue)
    }
  }

  function playSound(cue: CuePoint) {
    try {
      let howl = soundInstances.value.get(cue.id)
      if (!howl) {
        const src = cue.resourceId || ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3']
        howl = new Howl({
          src,
          volume: (cue.volume ?? 70) / 100,
          onend: () => {
            soundInstances.value.delete(cue.id)
          },
        })
        soundInstances.value.set(cue.id, howl)
      }
      if (howl.state() !== 'loaded') {
        howl.once('load', () => howl?.play())
      } else {
        howl.play()
      }
    } catch (e) {
      console.warn('Sound play failed:', e)
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
    play,
    pause,
    reset,
    seek,
    isCueActive,
    triggerSequenceUpdate,
  }
})
