import { ref } from 'vue'
import { useTimelineStore } from '@/stores/timeline'
import { usePlaybackStore } from '@/stores/playback'
import { SNAP_GRID, snapToGrid } from '@/stores/timeline'

export function useDragCue(trackElement: () => HTMLElement | null, pxPerSecond: () => number) {
  const timelineStore = useTimelineStore()
  const playbackStore = usePlaybackStore()

  const draggingCueId = ref<string | null>(null)
  const dragStartTime = ref<number>(0)
  const dragStartX = ref<number>(0)
  let lastAppliedTime = -1

  function onMouseDown(e: MouseEvent, cueId: string, currentCueTime: number) {
    e.preventDefault()
    e.stopPropagation()
    draggingCueId.value = cueId
    dragStartTime.value = currentCueTime
    dragStartX.value = e.clientX
    lastAppliedTime = snapToGrid(currentCueTime)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    if (!draggingCueId.value) return
    const el = trackElement()
    if (!el) return
    const deltaX = e.clientX - dragStartX.value
    const deltaTime = deltaX / pxPerSecond()
    const rawTime = Math.max(0, dragStartTime.value + deltaTime)
    const snappedTime = snapToGrid(rawTime, SNAP_GRID)

    if (snappedTime !== lastAppliedTime) {
      lastAppliedTime = snappedTime
      timelineStore.updateCueTime(draggingCueId.value, snappedTime, true)
      playbackStore.triggerSequenceUpdate()
      playbackStore.computeStageState()
    }
  }

  function onMouseUp() {
    if (draggingCueId.value) {
      const cue = timelineStore.currentCues.find((c) => c.id === draggingCueId.value)
      if (cue) {
        const finalSnappedTime = snapToGrid(cue.time, SNAP_GRID)
        timelineStore.updateCueTime(draggingCueId.value, finalSnappedTime, true)
      }
      playbackStore.triggerSequenceUpdate()
      playbackStore.computeStageState()
    }
    draggingCueId.value = null
    lastAppliedTime = -1
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  return {
    draggingCueId,
    onMouseDown,
  }
}
