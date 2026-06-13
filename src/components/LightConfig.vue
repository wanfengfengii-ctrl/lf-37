<template>
  <n-space vertical size="medium">
    <div class="config-row">
      <n-text depth="2" style="font-size: 12px;">灯光亮度</n-text>
      <n-space align="center">
        <n-slider
          v-model:value="value"
          :min="0"
          :max="100"
          :step="1"
          style="width: 160px;"
          :tooltip="false"
          @update:value="onValueChange"
        />
        <n-input-number
          v-model:value="value"
          :min="0"
          :max="100"
          size="small"
          style="width: 70px;"
          :show-button="false"
          @update:value="onValueChange"
        />
        <n-tag size="small" :type="tagType" :bordered="false">%</n-tag>
      </n-space>
    </div>

    <div class="preview-box" :style="previewStyle">
      <div class="light-preview">
        <n-icon size="48" :color="iconColor">
          <component :is="BulbFilled" />
        </n-icon>
        <n-text depth="2" style="font-size: 11px;">灯光预览</n-text>
      </div>
    </div>

    <n-space size="small" wrap>
      <n-button size="tiny" @click="value = 0">灭灯</n-button>
      <n-button size="tiny" @click="value = 30">30%</n-button>
      <n-button size="tiny" @click="value = 60">60%</n-button>
      <n-button size="tiny" @click="value = 80" type="primary">80%</n-button>
      <n-button size="tiny" @click="value = 100">100%</n-button>
    </n-space>

    <n-alert v-if="value < 10" type="warning" :show-icon="false" size="small">
      亮度较低，注意舞台可见度
    </n-alert>
  </n-space>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { NAlert, NButton, NIcon, NInputNumber, NSlider, NSpace, NTag, NText } from 'naive-ui'
import { BulbFilled } from '@vicons/antd'
import { useTimelineStore } from '@/stores/timeline'

const timelineStore = useTimelineStore()

const value = computed({
  get: () => timelineStore.selectedCue?.brightness ?? 80,
  set: (v) => {
    if (timelineStore.selectedCue) {
      timelineStore.updateCue(timelineStore.selectedCue.id, { brightness: v })
    }
  },
})

function onValueChange(v: number | null) {
  if (v === null) return
  const clamped = Math.max(0, Math.min(100, v))
  if (clamped !== v && timelineStore.selectedCue) {
    timelineStore.updateCue(timelineStore.selectedCue.id, { brightness: clamped })
  }
}

const tagType = computed(() => {
  if (value.value === 0) return 'default'
  if (value.value < 30) return 'warning'
  if (value.value < 70) return 'info'
  return 'success'
})

const previewStyle = computed(() => ({
  background: `rgba(241, 196, 15, ${0.05 + (value.value / 100) * 0.35})`,
  boxShadow: value.value > 0 ? `0 0 ${20 + value.value / 2}px rgba(241, 196, 15, ${value.value / 200})` : 'none',
}))

const iconColor = computed(() => {
  const v = value.value / 100
  const r = Math.floor(241 * 0.4 + 255 * v * 0.6)
  const g = Math.floor(196 * 0.4 + 220 * v * 0.6)
  const b = Math.floor(15 * 0.4 + 120 * v * 0.6)
  return `rgb(${r}, ${g}, ${b})`
})
</script>

<style scoped>
.config-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-box {
  padding: 18px;
  border-radius: 10px;
  text-align: center;
  transition: all 0.3s ease;
}

.light-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
</style>
