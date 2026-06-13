<template>
  <div class="version-history">
    <div class="panel-header">
      <n-space align="center" justify="space-between" style="width: 100%;">
        <n-space align="center" size="small">
          <n-icon size="16" :color="'#67C23A'"><component :is="HistoryOutlined" /></n-icon>
          <n-text strong style="font-size: 13px;">版本回放</n-text>
        </n-space>
        <n-space size="small">
          <n-button
            size="tiny"
            type="primary"
            :disabled="selectedIds.length !== 2"
            @click="onCompare"
          >
            对比
          </n-button>
          <n-button
            size="tiny"
            @click="onCreateSnapshot"
          >
            快照
          </n-button>
        </n-space>
      </n-space>
    </div>

    <div v-if="showDiff && diffResult.length > 0" class="diff-section">
      <div class="diff-header">
        <n-space align="center" justify="space-between" style="width: 100%;">
          <n-text strong style="font-size: 12px;">版本差异</n-text>
          <n-button text size="tiny" @click="onCloseDiff">
            <n-icon size="14"><component :is="CloseOutlined" /></n-icon>
          </n-button>
        </n-space>
      </div>
      <version-diff :diffs="diffResult" />
    </div>

    <div class="version-list">
      <div v-if="annotationStore.versionSnapshots.length === 0" class="empty-hint">
        <n-text depth="3" style="font-size: 12px;">暂无版本快照，保存时自动生成</n-text>
      </div>
      <div
        v-for="(snapshot, idx) in annotationStore.versionSnapshots"
        :key="snapshot.id"
        class="version-item"
        :class="{
          selected: selectedIds.includes(snapshot.id),
          'is-latest': idx === annotationStore.versionSnapshots.length - 1,
        }"
        @click="onSelect(snapshot.id)"
      >
        <div class="version-check">
          <n-checkbox
            :checked="selectedIds.includes(snapshot.id)"
            @update:checked="() => onSelect(snapshot.id)"
            size="small"
          />
        </div>
        <div class="version-info">
          <div class="version-label">
            <n-text strong style="font-size: 12px;">{{ snapshot.label }}</n-text>
            <n-tag v-if="idx === annotationStore.versionSnapshots.length - 1" size="tiny" :bordered="false" type="success" round>
              最新
            </n-tag>
          </div>
          <div class="version-meta">
            <n-text depth="3" style="font-size: 11px;">
              {{ snapshot.scenes.length }} 场 · {{ totalCount(snapshot) }} cue · {{ snapshot.annotations.length }} 批注
            </n-text>
          </div>
          <div class="version-time">
            {{ formatTime(snapshot.createdAt) }}
          </div>
        </div>
        <div class="version-actions">
          <n-dropdown :options="snapshotActions" @select="(key: string) => onSnapshotAction(key, snapshot.id)">
            <n-button text size="tiny">
              <n-icon size="14"><component :is="MoreOutlined" /></n-icon>
            </n-button>
          </n-dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NCheckbox, NDropdown, NIcon, NSpace, NTag, NText, useMessage, useDialog } from 'naive-ui'
import { HistoryOutlined, CloseOutlined, MoreOutlined } from '@vicons/antd'
import { useAnnotationStore } from '@/stores/annotation'
import { usePlaybackStore } from '@/stores/playback'
import { useTimelineStore } from '@/stores/timeline'
import VersionDiff from './VersionDiff.vue'
import type { VersionDiffItem } from '@/types'

const annotationStore = useAnnotationStore()
const playbackStore = usePlaybackStore()
const timelineStore = useTimelineStore()
const message = useMessage()
const dialog = useDialog()

const selectedIds = ref<string[]>([])
const showDiff = ref(false)
const diffResult = ref<VersionDiffItem[]>([])

function totalCount(snapshot: { scenes: { cues: unknown[] }[] }) {
  return snapshot.scenes.reduce((sum, s) => sum + s.cues.length, 0)
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
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

function onSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    if (selectedIds.value.length >= 2) {
      selectedIds.value.shift()
    }
    selectedIds.value.push(id)
  }
}

function onCompare() {
  if (selectedIds.value.length !== 2) return
  diffResult.value = annotationStore.compareVersions(selectedIds.value[0], selectedIds.value[1])
  showDiff.value = true
}

function onCloseDiff() {
  showDiff.value = false
  diffResult.value = []
}

function onCreateSnapshot() {
  const snapshot = annotationStore.createSnapshot()
  message.success(`已创建快照：${snapshot.label}`)
}

const snapshotActions = [
  { label: '恢复此版本', key: 'restore' },
  { label: '删除', key: 'delete' },
]

function onSnapshotAction(key: string, id: string) {
  if (key === 'restore') {
    dialog.warning({
      title: '恢复版本',
      content: '恢复此版本将覆盖当前所有编排数据，是否继续？',
      positiveText: '确定恢复',
      negativeText: '取消',
      onPositiveClick: () => {
        const result = annotationStore.restoreSnapshot(id)
        if (result.ok) {
          selectedIds.value = []
          showDiff.value = false
          diffResult.value = []
          playbackStore.reset()
          timelineStore.selectCue(null)
          message.success('版本已恢复')
        } else {
          message.error(result.message || '恢复失败')
        }
      },
    })
  } else if (key === 'delete') {
    annotationStore.deleteSnapshot(id)
    selectedIds.value = selectedIds.value.filter((sid) => sid !== id)
    if (selectedIds.value.length < 2) {
      showDiff.value = false
      diffResult.value = []
    }
    message.success('快照已删除')
  }
}
</script>

<style scoped>
.version-history {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  padding: 12px 16px 8px;
  flex-shrink: 0;
}

.diff-section {
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.diff-header {
  padding: 8px 16px 4px;
}

.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.version-item {
  display: flex;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  border: 1px solid #e8e8e8;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 8px;
}

.version-item:hover {
  border-color: #c0c4cc;
}

.version-item.selected {
  border-color: #409EFF;
  background: #ecf5ff;
}

.version-item.is-latest {
  border-left: 3px solid #67C23A;
}

.version-check {
  flex-shrink: 0;
  padding-top: 2px;
}

.version-info {
  flex: 1;
  min-width: 0;
}

.version-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.version-meta {
  margin-bottom: 2px;
}

.version-time {
  font-size: 11px;
  color: #909399;
}

.version-actions {
  flex-shrink: 0;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}
</style>
