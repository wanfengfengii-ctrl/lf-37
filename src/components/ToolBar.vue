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

    <n-space size="small">
      <n-button size="small" :type="annotationStore.showAnnotationPanel ? 'primary' : 'default'" @click="annotationStore.showAnnotationPanel = !annotationStore.showAnnotationPanel">
        <template #icon><n-icon><component :is="CommentOutlined" /></n-icon></template>
        批注
      </n-button>
      <n-button size="small" :type="annotationStore.showVersionPanel ? 'primary' : 'default'" @click="annotationStore.showVersionPanel = !annotationStore.showVersionPanel">
        <template #icon><n-icon><component :is="HistoryOutlined" /></n-icon></template>
        版本
      </n-button>
      <n-tag
        v-if="annotationStore.pendingRiskCount > 0"
        size="tiny"
        round
        :bordered="false"
        type="error"
      >
        ⚠️ {{ annotationStore.pendingRiskCount }} 风险
      </n-tag>
    </n-space>

    <n-space size="small" style="margin-left: auto;">
      <n-tag 
        v-if="sceneStore.lastSavedAt" 
        size="tiny" 
        round 
        :bordered="false" 
        type="success"
        :title="'上次保存: ' + formatLastSaved(sceneStore.lastSavedAt)"
      >
        💾 已自动保存
      </n-tag>
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
import { computed, h, watch, ref, nextTick } from 'vue'
import { NButton, NDivider, NIcon, NInputNumber, NSelect, NSpace, NSlider, NText, useMessage } from 'naive-ui'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  SaveOutlined,
  SkinOutlined,
  CommentOutlined,
  HistoryOutlined,
} from '@vicons/antd'
import { useSceneStore } from '@/stores/scene'
import { usePlaybackStore } from '@/stores/playback'
import { useTimelineStore } from '@/stores/timeline'
import { useResourceStore } from '@/stores/resource'
import { useAnnotationStore } from '@/stores/annotation'
import { useVersionStore } from '@/stores/version'
import { useTeamStore } from '@/stores/team'
import {
  serializeExportPayload,
  deserializeImportPayload,
  downloadExportFile,
  readJsonFile,
} from '@/utils/storage'
import { buildResourceNameMap, remapSceneResourceIds } from '@/utils/resource-map'
import ValidationBadge from './ValidationBadge.vue'

const sceneStore = useSceneStore()
const playbackStore = usePlaybackStore()
const timelineStore = useTimelineStore()
const resourceStore = useResourceStore()
const annotationStore = useAnnotationStore()
const versionStore = useVersionStore()
const teamStore = useTeamStore()
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

function formatLastSaved(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

function togglePlay() {
  if (playbackStore.isPlaying) playbackStore.pause()
  else playbackStore.play()
}

function onSave() {
  try {
    sceneStore.scheduleAutoSave()
    versionStore.createSnapshot({
      scenes: sceneStore.scenes,
      annotations: annotationStore.annotations,
      resources: resourceStore.resources,
      isMilestone: false,
    })
    message.success('已保存到本地，并自动生成版本快照')
  } catch (e) {
    message.error('保存失败')
  }
}

function onExport() {
  try {
    const exportScenes = sceneStore.scenes.map(s => ({
      ...s,
      cues: s.cues.map(c => {
        const res = c.resourceId ? resourceStore.resources.find(r => r.id === c.resourceId) : null
        return { ...c, _resourceName: res?.name || '' }
      }),
    }))
    const content = serializeExportPayload({
      scenes: exportScenes,
      annotations: annotationStore.annotations,
      versions: versionStore.versionSnapshots,
      teamMembers: teamStore.teamMembers,
    })
    const filename = `皮影戏编排_${new Date().toISOString().slice(0, 10)}.json`
    downloadExportFile(filename, content)
    message.success('导出成功')
  } catch (e) {
    message.error('导出失败')
  }
}

async function onImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const raw = await readJsonFile(file)
      const result = deserializeImportPayload(JSON.stringify(raw))
      if (!result) {
        message.error('导入失败：文件格式错误')
        return
      }
      const scenes = result.scenes as Array<{ cues: Array<{ resourceId?: string; trackType: any; _resourceName?: string }> }>
      remapSceneResourceIds(scenes, resourceStore.resources)
      const replaceResult = sceneStore.replaceAllScenes(scenes as any[])
      if (replaceResult.ok) {
        if (result.annotations && Array.isArray(result.annotations)) {
          annotationStore.replaceAllAnnotations(result.annotations as any[])
        }
        if (result.teamMembers && Array.isArray(result.teamMembers)) {
          // 团队成员导入可选，暂不自动覆盖
        }
        timelineStore.selectCue(null)
        playbackStore.reset()
        nextTick(() => {
          timelineStore.detectCharacterConflicts()
          playbackStore.computeStageState()
          playbackStore.triggerSequenceUpdate()
        })
        message.success(`导入成功，共 ${replaceResult.count} 个场次`)
      } else {
        message.error(replaceResult.message || '导入失败')
      }
    } catch (err) {
      message.error('导入失败：文件格式错误')
    }
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
