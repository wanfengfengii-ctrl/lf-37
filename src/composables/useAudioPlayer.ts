import { ref, onUnmounted } from 'vue'
import { Howl } from 'howler'

interface ActiveSound {
  id: string
  howl: Howl
}

export function useAudioPlayer() {
  const activeSounds = ref<Map<string, ActiveSound>>(new Map())
  const isMuted = ref(false)

  function play(id: string, src: string | string[], volume = 0.7) {
    stop(id)
    try {
      const howl = new Howl({
        src: Array.isArray(src) ? src : [src],
        volume: isMuted.value ? 0 : volume,
        onend: () => {
          activeSounds.value.delete(id)
        },
        onloaderror: (_id, err) => {
          console.warn('Audio load error:', id, err)
          activeSounds.value.delete(id)
        },
      })
      activeSounds.value.set(id, { id, howl })
      if (howl.state() === 'loaded') {
        howl.play()
      } else {
        howl.once('load', () => howl.play())
      }
    } catch (e) {
      console.warn('Audio play failed:', e)
    }
  }

  function stop(id: string) {
    const s = activeSounds.value.get(id)
    if (s) {
      try {
        s.howl.stop()
      } catch {}
      activeSounds.value.delete(id)
    }
  }

  function stopAll() {
    for (const s of activeSounds.value.values()) {
      try {
        s.howl.stop()
      } catch {}
    }
    activeSounds.value.clear()
  }

  function setVolume(id: string, volume: number) {
    const s = activeSounds.value.get(id)
    if (s) {
      s.howl.volume(isMuted.value ? 0 : Math.max(0, Math.min(1, volume)))
    }
  }

  function setGlobalMute(muted: boolean) {
    isMuted.value = muted
    for (const s of activeSounds.value.values()) {
      s.howl.volume(muted ? 0 : s.howl._volume as number)
    }
  }

  onUnmounted(() => {
    stopAll()
  })

  return {
    activeSounds,
    isMuted,
    play,
    stop,
    stopAll,
    setVolume,
    setGlobalMute,
  }
}
