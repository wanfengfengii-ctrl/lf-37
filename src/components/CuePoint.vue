<template>
  <div
    class="cue-item"
    :class="{
      selected: isSelected,
      conflict: isConflict,
      active: isActive,
      dragging: isDragging,
    }"
    :style="{
      left: leftPx + 'px',
      background: TRACK_COLORS[cue.trackType],
      borderColor: isConflict ? '#ff4d4f' : undefined,
    }"
    @mousedown="onMouseDown"
    @click.stop="timelineStore.selectCue(cue.id)"
    :title="tooltipText"
  >
    <div class="cue-icon">{{ displayIcon }}</div>
    <div class="cue-label">{{ displayLabel }}</div>
    <div class="cue-time">{{ cue.time.toFixed(1) }}s</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TRACK_COLORS, TRACK_LABELS, POSITION_LABELS } from '@/types'
import { useTimelineStore } from '@/stores/timeline'
import { useResourceStore } from '@/stores/resource'
import { usePlaybackStore } from '@/stores/playback'

const props = defineProps<{
  cue: any
  pxPerSecond: number
  isDragging?: boolean
}>()

const emit = defineEmits<{
  (e: 'dragstart', event: MouseEvent, cueId: string, time: number): void
}>()

const timelineStore = useTimelineStore()
const resourceStore = useResourceStore()
const playbackStore = usePlaybackStore()

const leftPx = computed(() => props.cue.time * props.pxPerSecond - 26)
const isSelected = computed(() => timelineStore.selectedCueId === props.cue.id)
const isConflict = computed(() => timelineStore.isCueInConflict(props.cue.id))
const isActive = computed(() => playbackStore.isCueActive(props.cue.id))

const resource = computed(() =>
  props.cue.resourceId ? resourceStore.getResourceById(props.cue.resourceId) : null
)

const displayIcon = computed(() => {
  if (resource.value?.icon) return resource.value.icon
  const icons: Record<string, string> = {
    character: '🎭',
    lighting: '💡',
    sound: '🥁',
    narration: '📝',
    backdrop: '🏞️',
  }
  return icons[props.cue.trackType] || '•'
})

const displayLabel = computed(() => {
  if (resource.value) return resource.value.name
  if (props.cue.trackType === 'lighting') return `亮度 ${props.cue.brightness}%`
  if (props.cue.trackType === 'narration') return props.cue.narration?.slice(0, 6) || '旁白'
  return TRACK_LABELS[props.cue.trackType]
})

const tooltipText = computed(() => {
  const parts = [`[${TRACK_LABELS[props.cue.trackType]}]`, `时间: ${props.cue.time.toFixed(2)}s`]
  if (resource.value) parts.push(`资源: ${resource.value.name}`)
  if (props.cue.trackType === 'lighting') parts.push(`亮度: ${props.cue.brightness}%`)
  if (props.cue.trackType === 'sound') parts.push(`音量: ${props.cue.volume}%`)
  if (props.cue.trackType === 'character') parts.push(`幕位: ${POSITION_LABELS[props.cue.position]}`)
  if (props.cue.trackType === 'narration') parts.push(`旁白: ${props.cue.narration}`)
  return parts.join(' | ')
})

function onMouseDown(e: MouseEvent) {
  emit('dragstart', e, props.cue.id, props.cue.time)
}
</script>

<style scoped>
.cue-item {
  position: absolute;
  top: 8px;
  width: 52px;
  height: 40px;
  border-radius: 8px;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  border: 2px solid transparent;
  transition: transform 0.1s ease, box-shadow 0.2s ease;
  font-size: 0;
}

.cue-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.cue-item:active {
  cursor: grabbing;
}

.cue-item.selected {
  z-index: 3;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #2080f0, 0 4px 14px rgba(32, 128, 240, 0.4);
}

.cue-item.conflict {
  animation: conflictPulse 1s ease-in-out infinite;
}

.cue-item.active {
  z-index: 4;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #52c41a, 0 4px 14px rgba(82, 196, 26, 0.5);
  transform: scale(1.05);
}

.cue-item.dragging {
  opacity: 0.85;
  z-index: 10;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.cue-icon {
  font-size: 14px;
  line-height: 1;
}

.cue-label {
  font-size: 10px;
  line-height: 1.2;
  margin-top: 1px;
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.cue-time {
  font-size: 9px;
  opacity: 0.85;
  line-height: 1;
  margin-top: 1px;
}

@keyframes conflictPulse {
  0%, 100% { box-shadow: 0 0 0 2px #ff4d4f, 0 2px 8px rgba(255, 77, 79, 0.3); }
  50% { box-shadow: 0 0 0 4px #ff4d4f, 0 4px 16px rgba(255, 77, 79, 0.5); }
}
</style>
