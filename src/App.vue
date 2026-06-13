<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <div class="app-root">
              <tool-bar />

              <div class="stage-wrapper">
                <stage-preview />
              </div>

              <div class="main-layout">
                <aside class="left-panel">
                  <resource-panel />
                </aside>

                <main class="center-panel">
                  <timeline />
                </main>

                <aside class="right-panel">
                  <div class="right-tabs">
                    <div
                      class="tab-item"
                      :class="{ active: rightTab === 'config' }"
                      @click="rightTab = 'config'"
                    >
                      配置
                    </div>
                    <div
                      class="tab-item"
                      :class="{ active: rightTab === 'annotation' }"
                      @click="rightTab = 'annotation'"
                    >
                      批注
                      <span v-if="annotationStore.unresolvedCount > 0" class="tab-badge">{{ annotationStore.unresolvedCount }}</span>
                    </div>
                    <div
                      class="tab-item"
                      :class="{ active: rightTab === 'version' }"
                      @click="rightTab = 'version'"
                    >
                      版本
                    </div>
                  </div>

                  <div v-if="rightTab === 'config'" class="tab-content">
                    <div v-if="!timelineStore.selectedCue" class="empty-panel">
                      <n-icon size="48" :color="'#C0C4CC'">
                        <component :is="SettingOutlined" />
                      </n-icon>
                      <n-text depth="3" style="margin-top: 12px;">选中时间轴上的 cue 点</n-text>
                      <n-text depth="3" style="font-size: 12px;">即可在此处配置参数</n-text>
                    </div>

                    <div v-else class="param-panel">
                      <div class="param-header">
                        <n-space align="center">
                          <n-tag
                            size="small"
                            round
                            :bordered="false"
                            :style="{ background: TRACK_COLORS[timelineStore.selectedCue.trackType] }"
                          >
                            {{ TRACK_LABELS[timelineStore.selectedCue.trackType] }}
                          </n-tag>
                          <n-text strong>{{ formatCueTime(timelineStore.selectedCue.time) }}</n-text>
                        </n-space>
                        <n-button
                          text
                          size="small"
                          type="error"
                          @click="onDeleteCue"
                        >
                          <template #icon>
                            <n-icon><component :is="DeleteOutlined" /></n-icon>
                          </template>
                          删除
                        </n-button>
                      </div>

                      <n-divider style="margin: 8px 0 16px;" />

                      <character-config v-if="timelineStore.selectedCue.trackType === 'character'" />
                      <light-config v-else-if="timelineStore.selectedCue.trackType === 'lighting'" />
                      <sound-config v-else-if="timelineStore.selectedCue.trackType === 'sound'" />
                      <narration-config v-else-if="timelineStore.selectedCue.trackType === 'narration'" />
                      <backdrop-config v-else-if="timelineStore.selectedCue.trackType === 'backdrop'" />
                    </div>
                  </div>

                  <div v-if="rightTab === 'annotation'" class="tab-content">
                    <annotation-panel />
                  </div>

                  <div v-if="rightTab === 'version'" class="tab-content">
                    <version-history />
                  </div>
                </aside>
              </div>

              <scene-bar />
            </div>
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  NButton,
  NConfigProvider,
  NDialogProvider,
  NDivider,
  NIcon,
  NLoadingBarProvider,
  NMessageProvider,
  NNotificationProvider,
  NSpace,
  NTag,
  NText,
} from 'naive-ui'
import { DeleteOutlined, SettingOutlined } from '@vicons/antd'
import { onMounted, nextTick, ref, watch } from 'vue'
import ToolBar from '@/components/ToolBar.vue'
import StagePreview from '@/components/StagePreview.vue'
import ResourcePanel from '@/components/ResourcePanel.vue'
import Timeline from '@/components/Timeline.vue'
import SceneBar from '@/components/SceneBar.vue'
import CharacterConfig from '@/components/CharacterConfig.vue'
import LightConfig from '@/components/LightConfig.vue'
import SoundConfig from '@/components/SoundConfig.vue'
import NarrationConfig from '@/components/NarrationConfig.vue'
import BackdropConfig from '@/components/BackdropConfig.vue'
import AnnotationPanel from '@/components/AnnotationPanel.vue'
import VersionHistory from '@/components/VersionHistory.vue'
import { useTimelineStore } from '@/stores/timeline'
import { usePlaybackStore } from '@/stores/playback'
import { useSceneStore } from '@/stores/scene'
import { useAnnotationStore } from '@/stores/annotation'
import { TRACK_COLORS, TRACK_LABELS } from '@/types'
import { useMessage } from 'naive-ui'

const timelineStore = useTimelineStore()
const playbackStore = usePlaybackStore()
const sceneStore = useSceneStore()
const annotationStore = useAnnotationStore()
const message = useMessage()
const rightTab = ref<'config' | 'annotation' | 'version'>('config')

watch(
  () => timelineStore.selectedCueId,
  (id) => {
    if (id) rightTab.value = 'config'
  }
)

watch(
  () => annotationStore.showAnnotationPanel,
  (v) => {
    if (v) rightTab.value = 'annotation'
  }
)

watch(
  () => annotationStore.showVersionPanel,
  (v) => {
    if (v) rightTab.value = 'version'
  }
)

onMounted(() => {
  if (sceneStore.lastSavedAt) {
    nextTick(() => {
      timelineStore.detectCharacterConflicts()
      playbackStore.computeStageState()
      playbackStore.triggerSequenceUpdate()
      const savedTime = new Date(sceneStore.lastSavedAt).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      message.info(`已自动恢复上次保存的编排（${savedTime}）`)
    })
  }
})

function formatCueTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  const ms = Math.floor((t % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`
}

function onDeleteCue() {
  if (timelineStore.selectedCue) {
    timelineStore.removeCue(timelineStore.selectedCue.id)
  }
}
</script>

<style scoped>
.app-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.stage-wrapper {
  height: 320px;
  flex-shrink: 0;
  padding: 12px 16px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
  border-bottom: 1px solid rgba(192, 57, 43, 0.3);
}

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.left-panel {
  width: 260px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  overflow: hidden;
}

.center-panel {
  flex: 1;
  overflow: hidden;
  background: #fff;
}

.right-panel {
  width: 320px;
  flex-shrink: 0;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.right-tabs {
  display: flex;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 13px;
  color: #909399;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
  position: relative;
}

.tab-item:hover {
  color: #303133;
  background: #f5f7fa;
}

.tab-item.active {
  color: #C0392B;
  font-weight: 600;
  border-bottom-color: #C0392B;
}

.tab-badge {
  position: absolute;
  top: 4px;
  right: 12px;
  background: #E6A23C;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  border-radius: 8px;
  padding: 0 4px;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.param-panel {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.param-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
