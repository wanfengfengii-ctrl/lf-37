<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <div class="app-root">
              <tool-bar />

              <div class="main-layout">
                <aside class="left-panel">
                  <resource-panel />
                </aside>

                <main class="center-panel">
                  <timeline />
                </main>

                <aside class="right-panel">
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
import ToolBar from '@/components/ToolBar.vue'
import ResourcePanel from '@/components/ResourcePanel.vue'
import Timeline from '@/components/Timeline.vue'
import SceneBar from '@/components/SceneBar.vue'
import CharacterConfig from '@/components/CharacterConfig.vue'
import LightConfig from '@/components/LightConfig.vue'
import SoundConfig from '@/components/SoundConfig.vue'
import NarrationConfig from '@/components/NarrationConfig.vue'
import BackdropConfig from '@/components/BackdropConfig.vue'
import { useTimelineStore } from '@/stores/timeline'
import { TRACK_COLORS, TRACK_LABELS } from '@/types'

const timelineStore = useTimelineStore()

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

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
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
