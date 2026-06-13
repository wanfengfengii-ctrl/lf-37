<template>
  <div class="timeline-container" @click="onBgClick">
    <div class="timeline-header">
      <div class="header-controls">
        <n-space align="center">
          <n-text depth="2" style="font-size: 12px;">缩放</n-text>
          <n-slider
            v-model:value="pxPerSecond"
            :min="4"
            :max="32"
            :step="1"
            style="width: 140px;"
          />
          <n-text depth="3" style="font-size: 11px; width: 46px; font-variant-numeric: tabular-nums;">
            {{ pxPerSecond }}px/s
          </n-text>
          <n-button size="tiny" text @click="pxPerSecond = 8">
            <template #icon><n-icon><component :is="ZoomInOutlined" /></n-icon></template>
            默认
          </n-button>
        </n-space>
      </div>

      <div class="header-right">
        <n-space size="small">
          <n-tag size="small" type="error" round :bordered="false">
            🎭 {{ charCount }}
          </n-tag>
          <n-tag size="small" type="warning" round :bordered="false">
            💡 {{ lightCount }}
          </n-tag>
          <n-tag size="small" type="warning" round :bordered="false">
            🥁 {{ soundCount }}
          </n-tag>
          <n-tag size="small" type="success" round :bordered="false">
            📝 {{ narrationCount }}
          </n-tag>
          <n-tag size="small" type="info" round :bordered="false">
            🏞️ {{ backdropCount }}
          </n-tag>
          <n-tag size="small" round type="primary" :bordered="false">
            共 {{ totalCues }} 个 cue
          </n-tag>
        </n-space>
      </div>
    </div>

    <n-scrollbar class="timeline-scroll" x-scrollable>
      <div class="timeline-scroll-inner" :style="{ width: totalWidth + 120 + 'px' }">
        <time-ruler
          :duration="duration"
          :px-per-second="pxPerSecond"
        />

        <div class="tracks-wrap">
          <div
            class="playhead"
            :style="{ left: 120 + playbackStore.currentTime * pxPerSecond + 'px' }"
          >
            <div class="playhead-dot" />
          </div>

          <timeline-track
            v-for="track in TRACK_ORDER"
            :key="track"
            :track-type="track"
            :cues="timelineStore.cuesByTrack[track]"
            :px-per-second="pxPerSecond"
          />
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NIcon, NScrollbar, NSlider, NSpace, NTag, NText } from 'naive-ui'
import { ZoomInOutlined } from '@vicons/antd'
import TimeRuler from './TimeRuler.vue'
import TimelineTrack from './TimelineTrack.vue'
import { TRACK_ORDER } from '@/types'
import { useTimelineStore } from '@/stores/timeline'
import { useSceneStore } from '@/stores/scene'
import { usePlaybackStore } from '@/stores/playback'

const timelineStore = useTimelineStore()
const sceneStore = useSceneStore()
const playbackStore = usePlaybackStore()

const pxPerSecond = ref(8)

const duration = computed(() => sceneStore.currentScene?.duration ?? 120)
const totalWidth = computed(() => duration.value * pxPerSecond.value)

const charCount = computed(() => timelineStore.cuesByTrack.character.length)
const lightCount = computed(() => timelineStore.cuesByTrack.lighting.length)
const soundCount = computed(() => timelineStore.cuesByTrack.sound.length)
const narrationCount = computed(() => timelineStore.cuesByTrack.narration.length)
const backdropCount = computed(() => timelineStore.cuesByTrack.backdrop.length)
const totalCues = computed(() => timelineStore.currentCues.length)

function onBgClick(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (t.closest('.cue-item') || t.closest('.track-label')) return
  if (t.closest('.timeline-track')) return
  timelineStore.selectCue(null)
}
</script>

<style scoped>
.timeline-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #ebeef5;
  background: #fafbfc;
  flex-wrap: wrap;
  gap: 8px;
}

.header-right {
  display: flex;
}

.timeline-scroll {
  flex: 1;
  overflow: hidden;
}

.timeline-scroll-inner {
  position: relative;
  min-width: 100%;
}

.tracks-wrap {
  position: relative;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #ff4d4f 0%, #cf1322 100%);
  z-index: 20;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(255, 77, 79, 0.5);
}

.playhead-dot {
  position: absolute;
  top: -5px;
  left: -5px;
  width: 12px;
  height: 12px;
  background: #ff4d4f;
  border-radius: 50%;
  border: 2px solid #fff;
  animation: playheadPulse 1.6s ease-in-out infinite;
}

@keyframes playheadPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.6); }
  50% { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(255, 77, 79, 0); }
}
</style>
