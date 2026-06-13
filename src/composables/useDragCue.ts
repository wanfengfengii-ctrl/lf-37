import { ref } from 'vue'
import { useTimelineStore } from '@/stores/timeline'
import { usePlaybackStore } from '@/stores/playback'

export function useDragCue(trackElement: () => HTMLElement | null, pxPerSecond: () => number) {
  const timelineStore = useTimelineStore()
  const playbackStore = usePlaybackStore()

  const draggingCueId = ref<string | null>(null)
  const dragStartTime = ref<number>(0)
  const dragStartX = ref<number>(0)

  function onMouseDown(e: MouseEvent, cueId: string, currentCueTime: number) {
    e.preventDefault()
    e.stopPropagation()
    draggingCueId.value = cueId
    dragStartTime.value = currentCueTime
    dragStartX.value = e.clientX
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    if (!draggingCueId.value) return
    const el = trackElement()
    if (!el) return
    const deltaX = e.clientX - dragStartX.value
    const deltaTime = deltaX / pxPerSecond()
    const newTime = Math.max(0, dragStartTime.value + deltaTime)
    timelineStore.updateCueTime(draggingCueId.value, newTime)
    playbackStore.triggerSequenceUpdate()
  }

  function onMouseUp() {
    draggingCueId.value = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    playbackStore.triggerSequenceUpdate()
  }

  return {
    draggingCueId,
    onMouseDown,
  }
}
