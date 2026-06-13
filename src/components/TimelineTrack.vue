<template>
  <div
    class="timeline-track"
    @click="onTrackClick"
    @dragover.prevent="onDragOver"
    @drop="onDrop"
    ref="trackEl"
  >
    <div class="track-label" :style="{ borderLeftColor: TRACK_COLORS[trackType] }">
      <span class="label-icon">{{ trackIcon }}</span>
      <span class="label-text">{{ TRACK_LABELS[trackType] }}</span>
      <n-tag size="tiny" round :bordered="false" type="default">
        {{ cues.length }}
      </n-tag>
    </div>

    <div class="track-area">
      <div class="track-content" :style="{ width: totalWidth + 'px' }">
        <div
          v-for="(cue, idx) in cues"
          :key="cue.id"
        >
          <cue-point
            :cue="cue"
            :px-per-second="pxPerSecond"
            :is-dragging="dragCueId === cue.id"
            @dragstart="onCueDragStart"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NTag } from 'naive-ui'
import CuePoint from './CuePoint.vue'
import { TRACK_COLORS, TRACK_LABELS, type TrackType } from '@/types'
import { useTimelineStore } from '@/stores/timeline'
import { useSceneStore } from '@/stores/scene'
import { usePlaybackStore } from '@/stores/playback'
import { useDragCue } from '@/composables/useDragCue'
import { useMessage } from 'naive-ui'

const props = defineProps<{
  trackType: TrackType
  cues: any[]
  pxPerSecond: number
}>()

const timelineStore = useTimelineStore()
const sceneStore = useSceneStore()
const playbackStore = usePlaybackStore()
const message = useMessage()

const trackEl = ref<HTMLElement | null>(null)

const totalWidth = computed(() => {
  return (sceneStore.currentScene?.duration ?? 120) * props.pxPerSecond
})

const trackIcon = computed(() => {
  const icons: Record<TrackType, string> = {
    character: '🎭',
    lighting: '💡',
    sound: '🥁',
    narration: '📝',
    backdrop: '🏞️',
  }
  return icons[props.trackType]
})

const { draggingCueId: dragCueId, onMouseDown } = useDragCue(
  () => trackEl.value,
  () => props.pxPerSecond
)

function onCueDragStart(e: MouseEvent, cueId: string, time: number) {
  onMouseDown(e, cueId, time)
}

function onTrackClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.cue-item')) return
  const areaEl = trackEl.value?.querySelector('.track-area') as HTMLElement | null
  if (!areaEl) return
  const rect = areaEl.getBoundingClientRect()
  const x = e.clientX - rect.left
  const time = Math.max(0, x / props.pxPerSecond)
  timelineStore.selectCue(null)
  if (props.trackType === 'lighting') {
    const cue = timelineStore.addCue({ trackType: 'lighting', time, brightness: 80 })
    if (cue) { timelineStore.selectCue(cue.id); message.success('已添加灯光 cue') }
  } else if (props.trackType === 'narration') {
    const cue = timelineStore.addCue({ trackType: 'narration', time, narration: '点击右侧编辑旁白文字' })
    if (cue) { timelineStore.selectCue(cue.id); message.success('已添加旁白 cue') }
  }
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDrop(e: DragEvent) {
  if (!e.dataTransfer) return
  try {
    const raw = e.dataTransfer.getData('application/json')
    if (!raw) return
    const data = JSON.parse(raw)
    if (data.type !== 'resource') return
    if (data.trackType !== props.trackType) return
    const areaEl = trackEl.value?.querySelector('.track-area') as HTMLElement | null
    if (!areaEl) return
    const rect = areaEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = Math.max(0, x / props.pxPerSecond)
    const cue = timelineStore.addCue({
      trackType: props.trackType,
      time,
      resourceId: data.resourceId,
      volume: props.trackType === 'sound' ? 70 : 0,
    })
    if (cue) {
      timelineStore.selectCue(cue.id)
      playbackStore.triggerSequenceUpdate()
      message.success(`已添加「${data.resourceName}」`)
    }
  } catch (err) {
    console.warn('Drop parse failed', err)
  }
}
</script>

<style scoped>
.timeline-track {
  display: flex;
  width: 100%;
  min-height: 64px;
  border-bottom: 1px solid #ebeef5;
  position: relative;
}

.track-track:hover {
  background: rgba(192, 57, 43, 0.02);
}

.track-label {
  flex: 0 0 120px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fafbfc;
  border-left: 5px solid;
  border-right: 1px solid #ebeef5;
  font-weight: 500;
  font-size: 13px;
  position: sticky;
  left: 0;
  z-index: 3;
}

.label-icon {
  font-size: 18px;
}

.label-text {
  flex: 1;
  color: #303133;
}

.track-area {
  flex: 1;
  position: relative;
  overflow-x: hidden;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent calc(100% - 1px),
      rgba(0, 0, 0, 0.03) calc(100% - 1px)
    );
}

.track-content {
  position: relative;
  height: 64px;
}
</style>
