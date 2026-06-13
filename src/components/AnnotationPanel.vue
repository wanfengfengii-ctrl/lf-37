<template>
  <div class="annotation-panel">
    <div class="panel-header">
      <n-space align="center" justify="space-between" style="width: 100%;">
        <n-space align="center" size="small">
          <n-icon size="16" :color="'#E6A23C'"><component :is="CommentOutlined" /></n-icon>
          <n-text strong style="font-size: 13px;">排练批注</n-text>
          <n-tag v-if="annotationStore.unresolvedCount > 0" size="tiny" round :bordered="false" type="warning">
            {{ annotationStore.unresolvedCount }}
          </n-tag>
        </n-space>
        <n-button size="tiny" type="primary" @click="showAddForm = true">
          <template #icon><n-icon size="12"><component :is="PlusOutlined" /></n-icon></template>
          添加
        </n-button>
      </n-space>
    </div>

    <div v-if="showAddForm" class="add-form">
      <n-select
        v-model:value="newAnnotation.type"
        :options="typeOptions"
        size="small"
        style="margin-bottom: 8px;"
      />
      <n-input
        v-model:value="newAnnotation.content"
        type="textarea"
        placeholder="输入批注内容..."
        :rows="2"
        size="small"
        style="margin-bottom: 8px;"
      />
      <n-space justify="end" size="small">
        <n-button size="tiny" @click="showAddForm = false">取消</n-button>
        <n-button size="tiny" type="primary" :disabled="!newAnnotation.content.trim()" @click="onAddAnnotation">
          确定
        </n-button>
      </n-space>
    </div>

    <div class="annotation-list" v-if="!showAddForm">
      <div v-if="filteredAnnotations.length === 0" class="empty-hint">
        <n-text depth="3" style="font-size: 12px;">暂无批注</n-text>
      </div>
      <div
        v-for="ann in filteredAnnotations"
        :key="ann.id"
        class="annotation-item"
        :class="{
          'is-risk': ann.type === 'risk',
          'is-director': ann.type === 'director',
          'is-actor': ann.type === 'actor',
          'is-resolved': ann.status === 'resolved',
        }"
      >
        <div class="ann-header">
          <n-space align="center" size="small">
            <span class="ann-type-icon">{{ typeIcon(ann.type) }}</span>
            <n-tag
              size="tiny"
              :bordered="false"
              :type="statusTagType(ann.status)"
              round
            >
              {{ statusLabel(ann.status) }}
            </n-tag>
            <n-tag v-if="ann.cueId" size="tiny" :bordered="false" round>
              Cue
            </n-tag>
          </n-space>
          <n-space align="center" size="tiny">
            <n-button text size="tiny" @click="startEdit(ann)" title="编辑">
              <n-icon size="13" :color="'#909399'"><component :is="EditOutlined" /></n-icon>
            </n-button>
            <n-dropdown :options="actionOptions" @select="(key: string) => onAction(key, ann)">
              <n-button text size="tiny">
                <n-icon size="14"><component :is="MoreOutlined" /></n-icon>
              </n-button>
            </n-dropdown>
          </n-space>
        </div>
        <div v-if="editingId === ann.id" class="ann-edit-area">
          <n-input
            v-model:value="editingContent"
            type="textarea"
            :rows="2"
            size="small"
            autofocus
          />
          <n-space justify="end" size="small" style="margin-top: 6px;">
            <n-button size="tiny" @click="editingId = null">取消</n-button>
            <n-button size="tiny" type="primary" :disabled="!editingContent.trim()" @click="onSaveEdit(ann.id)">保存</n-button>
          </n-space>
        </div>
        <div v-else class="ann-content" @dblclick="startEdit(ann)">{{ ann.content }}</div>
        <div class="ann-time">
          {{ formatTime(ann.createdAt) }}
          <span v-if="ann.createdAt !== ann.updatedAt" class="ann-edited">（已编辑）</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { NButton, NDropdown, NIcon, NInput, NSelect, NSpace, NTag, NText } from 'naive-ui'
import { CommentOutlined, PlusOutlined, MoreOutlined, EditOutlined } from '@vicons/antd'
import { useAnnotationStore } from '@/stores/annotation'
import { useSceneStore } from '@/stores/scene'
import { useTimelineStore } from '@/stores/timeline'
import type { Annotation, AnnotationType, AnnotationStatus } from '@/types'

const annotationStore = useAnnotationStore()
const sceneStore = useSceneStore()
const timelineStore = useTimelineStore()

const showAddForm = ref(false)
const editingId = ref<string | null>(null)
const editingContent = ref('')
const newAnnotation = reactive<{ type: AnnotationType; content: string }>({
  type: 'director',
  content: '',
})

const typeOptions = [
  { label: '🎬 导演批注', value: 'director' },
  { label: '🎭 演员提醒', value: 'actor' },
  { label: '⚠️ 风险标记', value: 'risk' },
]

const filteredAnnotations = computed(() => {
  const sceneId = sceneStore.currentSceneId
  const selectedCueId = timelineStore.selectedCueId
  let list = annotationStore.annotations.filter((a) => a.sceneId === sceneId)
  if (selectedCueId) {
    const cueAnnotations = list.filter((a) => a.cueId === selectedCueId)
    const sceneAnnotations = list.filter((a) => !a.cueId)
    list = [...cueAnnotations, ...sceneAnnotations]
  }
  return list.sort((a, b) => {
    if (a.type === 'risk' && b.type !== 'risk') return -1
    if (a.type !== 'risk' && b.type === 'risk') return 1
    if (a.status === 'resolved' && b.status !== 'resolved') return 1
    if (a.status !== 'resolved' && b.status === 'resolved') return -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

function typeIcon(type: AnnotationType) {
  const icons: Record<AnnotationType, string> = {
    director: '🎬',
    actor: '🎭',
    risk: '⚠️',
  }
  return icons[type]
}

function statusTagType(status: AnnotationStatus) {
  const map: Record<AnnotationStatus, 'default' | 'info' | 'success'> = {
    pending: 'default',
    in_progress: 'info',
    resolved: 'success',
  }
  return map[status]
}

function statusLabel(status: AnnotationStatus) {
  const map: Record<AnnotationStatus, string> = {
    pending: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
  }
  return map[status]
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function onAddAnnotation() {
  if (!newAnnotation.content.trim()) return
  annotationStore.addAnnotation({
    sceneId: sceneStore.currentSceneId,
    cueId: timelineStore.selectedCueId ?? undefined,
    type: newAnnotation.type,
    content: newAnnotation.content.trim(),
  })
  newAnnotation.content = ''
  newAnnotation.type = 'director'
  showAddForm.value = false
}

function startEdit(ann: Annotation) {
  editingId.value = ann.id
  editingContent.value = ann.content
}

function onSaveEdit(id: string) {
  if (!editingContent.value.trim()) return
  annotationStore.updateAnnotationContent(id, editingContent.value.trim())
  editingId.value = null
  editingContent.value = ''
}

function onAction(key: string, ann: Annotation) {
  switch (key) {
    case 'edit':
      startEdit(ann)
      break
    case 'in_progress':
      annotationStore.updateAnnotationStatus(ann.id, 'in_progress')
      break
    case 'resolved':
      annotationStore.updateAnnotationStatus(ann.id, 'resolved')
      break
    case 'pending':
      annotationStore.updateAnnotationStatus(ann.id, 'pending')
      break
    case 'delete':
      annotationStore.removeAnnotation(ann.id)
      break
  }
}

const actionOptions = computed(() => [
  { label: '编辑内容', key: 'edit' },
  { label: '标记处理中', key: 'in_progress' },
  { label: '标记已解决', key: 'resolved' },
  { label: '重置为待处理', key: 'pending' },
  { type: 'divider' as const, key: 'd1' },
  { label: '删除', key: 'delete' },
])
</script>

<style scoped>
.annotation-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  padding: 12px 16px 8px;
  flex-shrink: 0;
}

.add-form {
  padding: 0 16px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.annotation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.annotation-item {
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
  background: #fafafa;
  transition: all 0.2s ease;
}

.annotation-item:hover {
  border-color: #d0d0d0;
}

.annotation-item.is-risk {
  border-color: #ff4d4f;
  background: #fff1f0;
}

.annotation-item.is-risk:not(.is-resolved) {
  animation: riskPulse 2s ease-in-out infinite;
}

@keyframes riskPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.2); }
  50% { box-shadow: 0 0 0 3px rgba(255, 77, 79, 0.3); }
}

.annotation-item.is-director {
  border-left: 3px solid #E6A23C;
}

.annotation-item.is-actor {
  border-left: 3px solid #409EFF;
}

.annotation-item.is-resolved {
  opacity: 0.55;
}

.ann-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.ann-type-icon {
  font-size: 14px;
}

.ann-content {
  font-size: 13px;
  line-height: 1.5;
  color: #303133;
  word-break: break-all;
  cursor: text;
  border-radius: 4px;
  padding: 2px 4px;
  margin: 0 -4px;
  transition: background 0.15s ease;
}

.ann-content:hover {
  background: rgba(0, 0, 0, 0.04);
}

.ann-edit-area {
  margin-top: 4px;
}

.ann-edited {
  font-size: 10px;
  color: #C0C4CC;
  margin-left: 4px;
}

.ann-time {
  font-size: 11px;
  color: #909399;
  margin-top: 4px;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}
</style>
