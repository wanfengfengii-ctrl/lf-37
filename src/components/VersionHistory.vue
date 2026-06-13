<template>
  <div class="version-history">
    <div class="panel-header">
      <n-space align="center" justify="space-between" style="width: 100%;">
        <n-space align="center" size="small">
          <n-icon size="16" :color="'#67C23A'"><component :is="HistoryOutlined" /></n-icon>
          <n-text strong style="font-size: 13px;">版本回放</n-text>
          <n-tag
            v-if="milestoneCount > 0"
            size="tiny"
            round
            :bordered="false"
            type="success"
          >
            🏁 {{ milestoneCount }} 里程碑
          </n-tag>
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
            type="primary"
            @click="showCreateDialog = true"
          >
            <template #icon><n-icon size="12"><component :is="PlusOutlined" /></n-icon></template>
            快照
          </n-button>
        </n-space>
      </n-space>
    </div>

    <n-modal v-model:show="showCreateDialog" preset="card" title="创建版本快照" style="width: 440px;">
      <n-form label-placement="top">
        <n-form-item label="版本名称">
          <n-input v-model:value="newSnapshot.label" placeholder="请输入版本名称" />
        </n-form-item>
        <n-form-item label="版本说明">
          <n-input
            v-model:value="newSnapshot.description"
            type="textarea"
            :rows="3"
            placeholder="请输入版本说明（可选）"
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-checkbox v-model:checked="newSnapshot.isMilestone">
              标记为里程碑
            </n-checkbox>
          </n-space>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button size="small" @click="showCreateDialog = false">取消</n-button>
          <n-button size="small" type="primary" :disabled="!newSnapshot.label.trim()" @click="onCreateSnapshot">
            创建
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showEditDialog" preset="card" title="编辑版本信息" style="width: 440px;">
      <n-form label-placement="top">
        <n-form-item label="版本名称">
          <n-input v-model:value="editingSnapshot.label" placeholder="请输入版本名称" />
        </n-form-item>
        <n-form-item label="版本说明">
          <n-input
            v-model:value="editingSnapshot.description"
            type="textarea"
            :rows="3"
            placeholder="请输入版本说明（可选）"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button size="small" @click="showEditDialog = false">取消</n-button>
          <n-button size="small" type="primary" :disabled="!editingSnapshot.label.trim()" @click="onSaveEdit">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>

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
        <n-text depth="3" style="font-size: 12px;">暂无版本快照，点击上方按钮创建</n-text>
      </div>
      <div
        v-for="(snapshot, idx) in sortedSnapshots"
        :key="snapshot.id"
        class="version-item"
        :class="{
          selected: selectedIds.includes(snapshot.id),
          'is-latest': isLatest(snapshot),
          'is-locked': snapshot.isLocked,
          'is-milestone': snapshot.isMilestone,
        }"
        @click="onSelect(snapshot.id)"
      >
        <div class="version-check">
          <n-checkbox
            :checked="selectedIds.includes(snapshot.id)"
            @update:checked="() => onSelect(snapshot.id)"
            size="small"
            :disabled="snapshot.isLocked"
          />
        </div>
        <div class="version-info">
          <div class="version-label">
            <n-space align="center" size="tiny">
              <n-icon
                v-if="snapshot.isMilestone"
                size="14"
                :color="'#67C23A'"
                title="里程碑"
              >
                <component :is="FlagOutlined" />
              </n-icon>
              <n-icon
                v-if="snapshot.isLocked"
                size="14"
                :color="'#E6A23C'"
                title="已锁定"
              >
                <component :is="LockOutlined" />
              </n-icon>
              <n-text strong style="font-size: 12px;">{{ snapshot.label }}</n-text>
              <n-tag v-if="isLatest(snapshot)" size="tiny" :bordered="false" type="success" round>
                最新
              </n-tag>
              <n-tag v-if="snapshot.isMilestone" size="tiny" :bordered="false" type="success" round>
                里程碑
              </n-tag>
              <n-tag v-if="snapshot.isLocked" size="tiny" :bordered="false" type="warning" round>
                已锁定
              </n-tag>
            </n-space>
          </div>
          <div v-if="snapshot.description" class="version-desc">
            <n-text depth="3" style="font-size: 11px;">{{ snapshot.description }}</n-text>
          </div>
          <div class="version-meta">
            <n-text depth="3" style="font-size: 11px;">
              {{ snapshot.scenes.length }} 场 · {{ totalCount(snapshot) }} cue · {{ snapshot.annotations.length }} 批注
              <span v-if="snapshot.frozenAnnotationIds.length > 0" class="frozen-info">
                · ❄️ {{ snapshot.frozenAnnotationIds.length }} 条批注已冻结
              </span>
            </n-text>
          </div>
          <div class="version-time">
            {{ formatTime(snapshot.createdAt) }}
          </div>
        </div>
        <div class="version-actions">
          <n-dropdown
            :options="getSnapshotActions(snapshot)"
            @select="(key: string) => onSnapshotAction(key, snapshot)"
          >
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
import { ref, computed, reactive } from 'vue'
import {
  NButton, NCheckbox, NDropdown, NIcon, NSpace, NTag, NText,
  NModal, NForm, NFormItem, NInput, useMessage, useDialog
} from 'naive-ui'
import {
  HistoryOutlined, CloseOutlined, MoreOutlined, PlusOutlined,
  LockOutlined, FlagOutlined, EditOutlined, UnlockOutlined,
  DeleteOutlined, RollbackOutlined
} from '@vicons/antd'
import { useAnnotationStore } from '@/stores/annotation'
import { usePlaybackStore } from '@/stores/playback'
import { useTimelineStore } from '@/stores/timeline'
import VersionDiff from './VersionDiff.vue'
import type { VersionDiffItem, VersionSnapshot } from '@/types'

const annotationStore = useAnnotationStore()
const playbackStore = usePlaybackStore()
const timelineStore = useTimelineStore()
const message = useMessage()
const dialog = useDialog()

const selectedIds = ref<string[]>([])
const showDiff = ref(false)
const diffResult = ref<VersionDiffItem[]>([])
const showCreateDialog = ref(false)
const showEditDialog = ref(false)

const newSnapshot = reactive({
  label: '',
  description: '',
  isMilestone: false,
})

const editingSnapshot = reactive({
  id: '',
  label: '',
  description: '',
})

const sortedSnapshots = computed(() =>
  [...annotationStore.versionSnapshots].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
)

const milestoneCount = computed(() =>
  annotationStore.versionSnapshots.filter((v) => v.isMilestone).length
)

function isLatest(snapshot: VersionSnapshot): boolean {
  const sorted = sortedSnapshots.value
  return sorted.length > 0 && sorted[0].id === snapshot.id
}

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
  if (!newSnapshot.label.trim()) return
  const snapshot = annotationStore.createSnapshot({
    label: newSnapshot.label.trim(),
    description: newSnapshot.description.trim() || undefined,
    isMilestone: newSnapshot.isMilestone,
  })
  message.success(`已创建快照：${snapshot.label}`)
  showCreateDialog.value = false
  newSnapshot.label = ''
  newSnapshot.description = ''
  newSnapshot.isMilestone = false
}

function getSnapshotActions(snapshot: VersionSnapshot) {
  const actions = []
  if (!snapshot.isLocked) {
    actions.push({
      label: '编辑信息',
      key: 'edit',
      icon: () => h('n-icon', { size: 14 }, () => h(EditOutlined)),
    })
    actions.push({
      label: '标记为里程碑',
      key: 'milestone',
      icon: () => h('n-icon', { size: 14 }, () => h(FlagOutlined)),
    })
    actions.push({
      label: '锁定版本',
      key: 'lock',
      icon: () => h('n-icon', { size: 14 }, () => h(LockOutlined)),
    })
  } else {
    actions.push({
      label: '解锁版本',
      key: 'unlock',
      icon: () => h('n-icon', { size: 14 }, () => h(UnlockOutlined)),
    })
  }
  actions.push({
    label: '恢复此版本',
    key: 'restore',
    icon: () => h('n-icon', { size: 14 }, () => h(RollbackOutlined)),
  })
  if (!snapshot.isLocked) {
    actions.push({ type: 'divider' as const, key: 'd1' })
    actions.push({
      label: '删除',
      key: 'delete',
      icon: () => h('n-icon', { size: 14, color: '#F56C6C' }, () => h(DeleteOutlined)),
    })
  }
  return actions
}

function onSnapshotAction(key: string, snapshot: VersionSnapshot) {
  if (key === 'edit') {
    editingSnapshot.id = snapshot.id
    editingSnapshot.label = snapshot.label
    editingSnapshot.description = snapshot.description || ''
    showEditDialog.value = true
  } else if (key === 'lock') {
    annotationStore.toggleSnapshotLock(snapshot.id)
    message.success('版本已锁定，无法删除或修改')
  } else if (key === 'unlock') {
    annotationStore.toggleSnapshotLock(snapshot.id)
    message.success('版本已解锁')
  } else if (key === 'milestone') {
    annotationStore.toggleSnapshotMilestone(snapshot.id)
    message.success(snapshot.isMilestone ? '已取消里程碑标记' : '已标记为里程碑')
  } else if (key === 'restore') {
    dialog.warning({
      title: '恢复版本',
      content: `恢复此版本将覆盖当前所有编排数据，并同步恢复 ${snapshot.frozenAnnotationIds.length} 条批注的历史状态。是否继续？`,
      positiveText: '确定恢复',
      negativeText: '取消',
      onPositiveClick: () => {
        const result = annotationStore.restoreSnapshot(snapshot.id)
        if (result.ok) {
          selectedIds.value = []
          showDiff.value = false
          diffResult.value = []
          playbackStore.reset()
          timelineStore.selectCue(null)
          const frozenCount = (result as { frozenIds?: string[] }).frozenIds?.length || 0
          message.success(`版本已恢复${frozenCount > 0 ? `，同步恢复 ${frozenCount} 条批注状态` : ''}`)
        } else {
          message.error(result.message || '恢复失败')
        }
      },
    })
  } else if (key === 'delete') {
    dialog.warning({
      title: '删除版本',
      content: '确定要删除此版本快照吗？此操作不可恢复。',
      positiveText: '确定删除',
      negativeText: '取消',
      onPositiveClick: () => {
        annotationStore.deleteSnapshot(snapshot.id)
        selectedIds.value = selectedIds.value.filter((sid) => sid !== snapshot.id)
        if (selectedIds.value.length < 2) {
          showDiff.value = false
          diffResult.value = []
        }
        message.success('快照已删除')
      },
    })
  }
}

function onSaveEdit() {
  if (!editingSnapshot.label.trim()) return
  annotationStore.updateSnapshot(editingSnapshot.id, {
    label: editingSnapshot.label.trim(),
    description: editingSnapshot.description.trim() || undefined,
  })
  message.success('版本信息已更新')
  showEditDialog.value = false
}

import { h } from 'vue'
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

.version-item.is-locked {
  background: #fffbe6;
  border-color: #e6a23c;
}

.version-item.is-milestone {
  border-left: 3px solid #67C23A;
}

.version-item.is-milestone.is-locked {
  border-left: 3px solid #e6a23c;
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

.version-desc {
  margin-bottom: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  border-left: 2px solid #d9d9d9;
}

.version-meta {
  margin-bottom: 2px;
}

.frozen-info {
  color: #67C23A;
  margin-left: 4px;
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
