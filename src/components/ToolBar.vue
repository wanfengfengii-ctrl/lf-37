<template>
  <n-space align="center" class="toolbar" size="large">
    <div class="logo-area">
      <n-icon size="24" :color="'#C0392B'"><component :is="SkinOutlined" /></n-icon>
      <n-text strong style="font-size: 18px; color: #F5F0EB; letter-spacing: 2px;">皮影戏调度台</n-text>
    </div>

    <n-divider vertical />

    <n-select
      v-model:value="sceneStore.currentSceneId"
      :options="sceneOptions"
      style="width: 180px;"
      size="small"
      @update:value="sceneStore.setCurrentScene"
    />

    <n-input-number
      v-model:value="durationValue"
      :min="10"
      :max="3600"
      size="small"
      style="width: 130px;"
      :show-button="false"
      @update:value="onDurationChange"
    >
      <template #prefix>时长</template>
      <template #suffix>秒</template>
    </n-input-number>

    <n-divider vertical />

    <n-space size="small">
      <n-button size="small" quaternary :disabled="playbackStore.isPlaying" @click="playbackStore.reset">
        <template #icon><n-icon><component :is="ReloadOutlined" /></n-icon></template>
      </n-button>
      <n-button size="small" type="primary" :color="'#C0392B'" @click="togglePlay">
        <template #icon>
          <n-icon>
            <component :is="playbackStore.isPlaying ? PauseCircleOutlined : PlayCircleOutlined" />
          </n-icon>
        </template>
        {{ playbackStore.isPlaying ? '暂停' : '播放' }}
      </n-button>
    </n-space>

    <n-slider
      v-model:value="playbackStore.currentTime"
      :max="playbackStore.totalDuration"
      :step="0.1"
      style="width: 200px;"
      @update:value="playbackStore.seek"
    />
    <n-text depth="3" style="font-variant-numeric: tabular-nums; min-width: 90px;">
      {{ formatTime(playbackStore.currentTime) }} / {{ formatTime(playbackStore.totalDuration) }}
    </n-text>

    <n-divider vertical />

    <validation-badge />

    <n-space size="small" style="margin-left: auto;">
      <n-button size="small" @click="onExport">
        <template #icon><n-icon><component :is="DownloadOutlined" /></n-icon></template>
        导出
      </n-button>
      <n-button size="small" @click="onImport">
        <template #icon><n-icon><component :is="UploadOutlined" /></n-icon></template>
        导入
      </n-button>
      <n-button size="small" type="primary" @click="onSave">
        <template #icon><n-icon><component :is="SaveOutlined" /></n-icon></template>
        保存
      </n-button>
    </n-space>
  </n-space>
</template>

<script setup lang="ts">
import { computed, h, watch, ref } from 'vue'
import { NButton, NDivider, NIcon, NInputNumber, NSelect, NSpace, NSlider, NText, useMessage } from 'naive-ui'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  SaveOutlined,
  SkinOutlined,
} from '@vicons/antd'
import { useSceneStore } from '@/stores/scene'
import { usePlaybackStore } from '@/stores/playback'
import { useTimelineStore } from '@/stores/timeline'
import ValidationBadge from './ValidationBadge.vue'

const sceneStore = useSceneStore()
const playbackStore = usePlaybackStore()
const timelineStore = useTimelineStore()
const message = useMessage()

const durationValue = ref(sceneStore.currentScene?.duration ?? 120)

watch(
  () => sceneStore.currentSceneId,
  () => {
    durationValue.value = sceneStore.currentScene?.duration ?? 120
  }
)

watch(
  () => sceneStore.currentScene?.duration,
  (v) => {
    if (v !== undefined) durationValue.value = v
  }
)

const sceneOptions = computed(() =>
  sceneStore.scenes.map((s) => ({
    label: `${s.sceneNumber}${s.performable ? ' ✓' : ''}`,
    value: s.id,
  }))
)

function onDurationChange(v: number | null) {
  if (v !== null && sceneStore.currentScene) {
    sceneStore.updateSceneDuration(sceneStore.currentScene.id, v)
  }
}

function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  const ms = Math.floor((t % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`
}

function togglePlay() {
  if (playbackStore.isPlaying) playbackStore.pause()
  else playbackStore.play()
}

function onSave() {
  try {
    const data = {
      scenes: sceneStore.scenes,
      version: 1,
    }
    localStorage.setItem('shadow-puppet-stage', JSON.stringify(data))
    message.success('已保存到本地')
  } catch (e) {
    message.error('保存失败')
  }
}

function onExport() {
  try {
    const data = {
      scenes: sceneStore.scenes,
      version: 1,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `皮影戏编排_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  } catch (e) {
    message.error('导出失败')
  }
}

function onImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (data.scenes && Array.isArray(data.scenes)) {
          const result = sceneStore.replaceAllScenes(data.scenes)
          if (result.ok) {
            timelineStore.selectCue(null)
            playbackStore.reset()
            message.success(`导入成功，共 ${result.count} 个场次`)
          } else {
            message.error(result.message || '导入失败')
          }
        } else {
          message.error('导入失败：文件格式错误')
        }
      } catch (err) {
        message.error('导入失败：文件格式错误')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}
</script>

<style scoped>
.toolbar {
  padding: 8px 20px;
  background: linear-gradient(180deg, #1a1a2e 0%, #20203a 100%);
  border-bottom: 2px solid #c0392b;
  min-height: 56px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
