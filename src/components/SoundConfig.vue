<template>
  <n-space vertical size="medium">
    <div class="config-row">
      <n-text depth="2" style="font-size: 12px;">锣鼓音效</n-text>
      <n-select
        v-model:value="selectedResourceId"
        :options="soundOptions"
        placeholder="选择音效"
        size="small"
        clearable
        @update:value="onResourceChange"
      />
    </div>

    <div class="config-row">
      <n-space align="center" justify="space-between" style="margin-bottom: 4px;">
        <n-text depth="2" style="font-size: 12px;">音量</n-text>
        <n-tag size="small" :type="volType" :bordered="false">{{ volume }}%</n-tag>
      </n-space>
      <n-slider
        v-model:value="volume"
        :min="0"
        :max="100"
        :step="1"
        :tooltip="false"
        @update:value="onVolumeChange"
      />
    </div>

    <n-space>
      <n-button block size="small" type="primary" @click="onPreview">
        <template #icon><n-icon><component :is="SoundOutlined" /></n-icon></template>
        试听
      </n-button>
      <n-button block size="small" @click="onStop">
        <template #icon><n-icon><component :is="StopOutlined" /></n-icon></template>
        停止
      </n-button>
    </n-space>

    <n-alert type="info" :show-icon="false" size="small">
      <n-text depth="2" style="font-size: 11px;">
        💡 从左侧拖拽音效资源到时间轴锣鼓轨道，即可快速添加 cue
      </n-text>
    </n-alert>
  </n-space>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NAlert, NButton, NIcon, NSelect, NSpace, NSlider, NTag, NText, useMessage } from 'naive-ui'
import { SoundOutlined, StopOutlined } from '@vicons/antd'
import { Howl } from 'howler'
import { useTimelineStore } from '@/stores/timeline'
import { useResourceStore } from '@/stores/resource'

const timelineStore = useTimelineStore()
const resourceStore = useResourceStore()
const message = useMessage()

const selectedResourceId = computed({
  get: () => timelineStore.selectedCue?.resourceId ?? '',
  set: (v) => {
    if (timelineStore.selectedCue && v !== undefined) {
      timelineStore.updateCue(timelineStore.selectedCue.id, { resourceId: v })
    }
  },
})

const volume = computed({
  get: () => timelineStore.selectedCue?.volume ?? 70,
  set: (v) => {
    if (timelineStore.selectedCue) {
      timelineStore.updateCue(timelineStore.selectedCue.id, { volume: v })
    }
  },
})

const volType = computed(() => {
  if (volume.value === 0) return 'default'
  if (volume.value < 40) return 'info'
  if (volume.value < 80) return 'warning'
  return 'error'
})

const soundOptions = computed(() =>
  resourceStore.sounds.map((s) => ({
    label: `${s.icon} ${s.name}`,
    value: s.id,
  }))
)

let previewHowl: Howl | null = null

function onResourceChange(v: string | null) {
  if (v !== undefined && timelineStore.selectedCue) {
    timelineStore.updateCue(timelineStore.selectedCue.id, { resourceId: v ?? '' })
  }
}

function onVolumeChange(v: number | null) {
  if (v !== null && timelineStore.selectedCue) {
    const clamped = Math.max(0, Math.min(100, v))
    timelineStore.updateCue(timelineStore.selectedCue.id, { volume: clamped })
  }
}

function onPreview() {
  try {
    if (previewHowl) {
      previewHowl.stop()
      previewHowl.unload()
    }
    const res = selectedResourceId.value ? resourceStore.getResourceById(selectedResourceId.value) : null
    const audioUrl = res?.audioUrl || 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
    previewHowl = new Howl({
      src: [audioUrl],
      volume: (volume.value ?? 70) / 100,
      onloaderror: () => {
        message.warning('音效加载失败')
      },
    })
    previewHowl.play()
    message.info(`正在试听：${res?.name || '默认音效'}`)
  } catch (e) {
    message.warning('音效播放失败')
  }
}

function onStop() {
  if (previewHowl) {
    previewHowl.stop()
    message.info('已停止')
  }
}
</script>

<style scoped>
.config-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
