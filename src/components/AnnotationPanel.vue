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
          <n-tag v-if="annotationStore.overdueCount > 0" size="tiny" round :bordered="false" type="error">
            逾期 {{ annotationStore.overdueCount }}
          </n-tag>
        </n-space>
        <n-space size="tiny">
          <n-button size="tiny" @click="showStats = !showStats" :type="showStats ? 'info' : 'default'">
            <template #icon><n-icon size="12"><component :is="BarChartOutlined" /></n-icon></template>
            统计
          </n-button>
          <n-button size="tiny" type="primary" @click="showAddForm = true">
            <template #icon><n-icon size="12"><component :is="PlusOutlined" /></n-icon></template>
            添加
          </n-button>
        </n-space>
      </n-space>
    </div>

    <div v-if="showStats" class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ annotationStore.annotationStats.total }}</div>
          <div class="stat-label">总数</div>
        </div>
        <div class="stat-card stat-pending">
          <div class="stat-value">{{ annotationStore.annotationStats.pending }}</div>
          <div class="stat-label">待处理</div>
        </div>
        <div class="stat-card stat-progress">
          <div class="stat-value">{{ annotationStore.annotationStats.inProgress }}</div>
          <div class="stat-label">处理中</div>
        </div>
        <div class="stat-card stat-resolved">
          <div class="stat-value">{{ annotationStore.annotationStats.resolved }}</div>
          <div class="stat-label">已解决</div>
        </div>
        <div class="stat-card stat-overdue">
          <div class="stat-value">{{ annotationStore.annotationStats.overdue }}</div>
          <div class="stat-label">已逾期</div>
        </div>
        <div class="stat-card stat-risk">
          <div class="stat-value">{{ annotationStore.annotationStats.byType.risk }}</div>
          <div class="stat-label">风险项</div>
        </div>
      </div>
      <div class="stats-detail">
        <n-space vertical size="small" style="width: 100%;">
          <div class="stat-row">
            <span class="stat-row-label">优先级分布：</span>
            <n-space size="tiny">
              <n-tag size="tiny" type="error" round v-if="annotationStore.annotationStats.byPriority.critical > 0">
                紧急 {{ annotationStore.annotationStats.byPriority.critical }}
              </n-tag>
              <n-tag size="tiny" type="warning" round v-if="annotationStore.annotationStats.byPriority.high > 0">
                高 {{ annotationStore.annotationStats.byPriority.high }}
              </n-tag>
              <n-tag size="tiny" type="info" round v-if="annotationStore.annotationStats.byPriority.medium > 0">
                中 {{ annotationStore.annotationStats.byPriority.medium }}
              </n-tag>
              <n-tag size="tiny" type="default" round v-if="annotationStore.annotationStats.byPriority.low > 0">
                低 {{ annotationStore.annotationStats.byPriority.low }}
              </n-tag>
            </n-space>
          </div>
          <div class="stat-row" v-if="Object.keys(annotationStore.annotationStats.byAssignee).length > 0">
            <span class="stat-row-label">成员分配：</span>
            <n-space size="tiny">
              <n-tag
                v-for="(count, memberId) in annotationStore.annotationStats.byAssignee"
                :key="memberId"
                size="tiny"
                round
                :style="{ borderColor: getMemberColor(memberId as string) }"
              >
                {{ getMemberName(memberId as string) }} {{ count }}
              </n-tag>
            </n-space>
          </div>
          <div class="stat-row" v-if="Object.values(annotationStore.annotationStats.byRiskLevel).some(v => v > 0)">
            <span class="stat-row-label">风险级别：</span>
            <n-space size="tiny">
              <n-tag size="tiny" type="error" round v-if="annotationStore.annotationStats.byRiskLevel.critical > 0">
                致命 {{ annotationStore.annotationStats.byRiskLevel.critical }}
              </n-tag>
              <n-tag size="tiny" type="warning" round v-if="annotationStore.annotationStats.byRiskLevel.high > 0">
                高危 {{ annotationStore.annotationStats.byRiskLevel.high }}
              </n-tag>
              <n-tag size="tiny" type="info" round v-if="annotationStore.annotationStats.byRiskLevel.medium > 0">
                中危 {{ annotationStore.annotationStats.byRiskLevel.medium }}
              </n-tag>
              <n-tag size="tiny" type="default" round v-if="annotationStore.annotationStats.byRiskLevel.low > 0">
                低危 {{ annotationStore.annotationStats.byRiskLevel.low }}
              </n-tag>
            </n-space>
          </div>
        </n-space>
      </div>
    </div>

    <div class="filter-section">
      <n-space wrap size="tiny">
        <n-select
          v-model:value="annotationStore.currentFilter.type"
          :options="typeFilterOptions"
          size="tiny"
          style="width: 90px;"
          clearable
        />
        <n-select
          v-model:value="annotationStore.currentFilter.status"
          :options="statusFilterOptions"
          size="tiny"
          style="width: 90px;"
          clearable
        />
        <n-select
          v-model:value="annotationStore.currentFilter.priority"
          :options="priorityFilterOptions"
          size="tiny"
          style="width: 90px;"
          clearable
        />
        <n-select
          v-model:value="annotationStore.currentFilter.assigneeId"
          :options="assigneeFilterOptions"
          size="tiny"
          style="width: 100px;"
          clearable
        />
        <n-select
          v-model:value="annotationStore.currentFilter.riskLevel"
          :options="riskLevelFilterOptions"
          size="tiny"
          style="width: 90px;"
          clearable
        />
        <n-input
          v-model:value="annotationStore.currentFilter.keyword"
          size="tiny"
          placeholder="搜索..."
          style="width: 120px;"
          clearable
        >
          <template #prefix>
            <n-icon size="12"><component :is="SearchOutlined" /></n-icon>
          </template>
        </n-input>
      </n-space>
    </div>

    <div v-if="showAddForm" class="add-form">
      <n-input
        v-model:value="newAnnotation.content"
        type="textarea"
        placeholder="输入批注内容..."
        :rows="2"
        size="small"
        style="margin-bottom: 8px;"
      />
      <n-space wrap size="tiny" style="margin-bottom: 8px;">
        <n-select
          v-model:value="newAnnotation.type"
          :options="typeOptions"
          size="small"
          style="width: 110px;"
        />
        <n-select
          v-model:value="newAnnotation.priority"
          :options="priorityOptions"
          size="small"
          style="width: 90px;"
        />
        <n-select
          v-model:value="newAnnotation.assigneeId"
          :options="assigneeOptions"
          size="small"
          placeholder="指派给..."
          style="width: 110px;"
          clearable
        />
        <n-select
          v-model:value="newAnnotation.riskLevel"
          :options="riskLevelOptions"
          size="small"
          placeholder="风险级别"
          style="width: 100px;"
          clearable
        />
        <n-date-picker
          v-model:value="newAnnotation.deadline"
          type="date"
          size="small"
          placeholder="截止日期"
          style="width: 130px;"
          clearable
          value-format="yyyy-MM-dd"
        />
      </n-space>
      <n-space justify="end" size="small">
        <n-button size="tiny" @click="resetAddForm">取消</n-button>
        <n-button size="tiny" type="primary" :disabled="!newAnnotation.content.trim()" @click="onAddAnnotation">
          确定
        </n-button>
      </n-space>
    </div>

    <div class="annotation-list" v-if="!showAddForm">
      <div v-if="annotationStore.filteredAnnotations.length === 0" class="empty-hint">
        <n-text depth="3" style="font-size: 12px;">暂无批注</n-text>
      </div>
      <div
        v-for="ann in annotationStore.filteredAnnotations"
        :key="ann.id"
        class="annotation-item"
        :class="{
          'is-risk': ann.type === 'risk',
          'is-director': ann.type === 'director',
          'is-actor': ann.type === 'actor',
          'is-resolved': ann.status === 'resolved',
          'is-overdue': isOverdue(ann),
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
            <n-tag
              size="tiny"
              :bordered="false"
              :type="priorityTagType(ann.priority)"
              round
              v-if="ann.priority !== 'medium'"
            >
              {{ priorityLabel(ann.priority) }}
            </n-tag>
            <n-tag
              size="tiny"
              :bordered="false"
              type="error"
              round
              v-if="ann.riskLevel"
            >
              {{ riskLevelLabel(ann.riskLevel) }}
            </n-tag>
            <n-tag v-if="ann.cueId" size="tiny" :bordered="false" round>
              Cue
            </n-tag>
            <n-avatar
              v-if="ann.assigneeId"
              :size="18"
              round
              :style="{ backgroundColor: getMemberColor(ann.assigneeId) }"
            >
              <span style="font-size: 10px;">{{ getMemberAvatar(ann.assigneeId) }}</span>
            </n-avatar>
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
          <n-space wrap size="tiny" style="margin-top: 8px;">
            <n-select
              v-model:value="editingPriority"
              :options="priorityOptions"
              size="small"
              style="width: 90px;"
            />
            <n-select
              v-model:value="editingAssigneeId"
              :options="assigneeOptions"
              size="small"
              placeholder="指派给..."
              style="width: 110px;"
              clearable
            />
            <n-select
              v-model:value="editingRiskLevel"
              :options="riskLevelOptions"
              size="small"
              placeholder="风险级别"
              style="width: 100px;"
              clearable
            />
            <n-date-picker
              v-model:value="editingDeadline"
              type="date"
              size="small"
              placeholder="截止日期"
              style="width: 130px;"
              clearable
              value-format="yyyy-MM-dd"
            />
          </n-space>
          <n-space justify="end" size="small" style="margin-top: 6px;">
            <n-button size="tiny" @click="cancelEdit">取消</n-button>
            <n-button size="tiny" type="primary" :disabled="!editingContent.trim()" @click="onSaveEdit(ann.id)">保存</n-button>
          </n-space>
        </div>
        <div v-else class="ann-content" @dblclick="startEdit(ann)">{{ ann.content }}</div>
        <div class="ann-footer">
          <n-space size="small" wrap>
            <span v-if="ann.assigneeId" class="ann-meta">
              👤 {{ getMemberName(ann.assigneeId) }}
            </span>
            <span v-if="ann.deadline" class="ann-meta" :class="{ 'overdue-text': isOverdue(ann) }">
              📅 {{ formatDeadline(ann.deadline) }}
            </span>
            <span class="ann-time">
              {{ formatTime(ann.createdAt) }}
              <span v-if="ann.createdAt !== ann.updatedAt" class="ann-edited">（已编辑）</span>
            </span>
          </n-space>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import {
  NButton, NDropdown, NIcon, NInput, NSelect, NSpace, NTag, NText,
  NAvatar, NDatePicker
} from 'naive-ui'
import {
  CommentOutlined, PlusOutlined, MoreOutlined, EditOutlined,
  BarChartOutlined, SearchOutlined
} from '@vicons/antd'
import { useAnnotationStore } from '@/stores/annotation'
import { useSceneStore } from '@/stores/scene'
import { useTimelineStore } from '@/stores/timeline'
import type {
  Annotation, AnnotationType, AnnotationStatus, AnnotationPriority, RiskLevel
} from '@/types'

const annotationStore = useAnnotationStore()
const sceneStore = useSceneStore()
const timelineStore = useTimelineStore()

const showAddForm = ref(false)
const showStats = ref(false)
const editingId = ref<string | null>(null)
const editingContent = ref('')
const editingPriority = ref<AnnotationPriority>('medium')
const editingAssigneeId = ref<string | undefined>(undefined)
const editingRiskLevel = ref<RiskLevel | undefined>(undefined)
const editingDeadline = ref<string | undefined>(undefined)

const newAnnotation = reactive<{
  type: AnnotationType
  content: string
  priority: AnnotationPriority
  assigneeId?: string
  riskLevel?: RiskLevel
  deadline?: string
}>({
  type: 'director',
  content: '',
  priority: 'medium',
})

function resetAddForm() {
  showAddForm.value = false
  newAnnotation.content = ''
  newAnnotation.type = 'director'
  newAnnotation.priority = 'medium'
  newAnnotation.assigneeId = undefined
  newAnnotation.riskLevel = undefined
  newAnnotation.deadline = undefined
}

const typeOptions = [
  { label: '🎬 导演批注', value: 'director' },
  { label: '🎭 演员提醒', value: 'actor' },
  { label: '⚠️ 风险标记', value: 'risk' },
]

const typeFilterOptions = [
  { label: '全部类型', value: 'all' },
  ...typeOptions,
]

const priorityOptions = [
  { label: '紧急', value: 'critical' },
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
]

const priorityFilterOptions = [
  { label: '全部优先级', value: 'all' },
  ...priorityOptions,
]

const riskLevelOptions = [
  { label: '致命', value: 'critical' },
  { label: '高危', value: 'high' },
  { label: '中危', value: 'medium' },
  { label: '低危', value: 'low' },
]

const riskLevelFilterOptions = [
  { label: '全部风险', value: 'all' },
  ...riskLevelOptions,
]

const statusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'in_progress' },
  { label: '已解决', value: 'resolved' },
]

const assigneeOptions = computed(() =>
  annotationStore.teamMembers.map((m) => ({
    label: `${m.avatar} ${m.name}`,
    value: m.id,
  }))
)

const assigneeFilterOptions = computed(() => [
  { label: '全部成员', value: 'all' },
  ...assigneeOptions.value,
])

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

function priorityTagType(priority: AnnotationPriority) {
  const map: Record<AnnotationPriority, 'default' | 'info' | 'warning' | 'error'> = {
    low: 'default',
    medium: 'info',
    high: 'warning',
    critical: 'error',
  }
  return map[priority]
}

function priorityLabel(priority: AnnotationPriority) {
  const map: Record<AnnotationPriority, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急',
  }
  return map[priority]
}

function riskLevelLabel(level: RiskLevel) {
  const map: Record<RiskLevel, string> = {
    low: '低危',
    medium: '中危',
    high: '高危',
    critical: '致命',
  }
  return map[level]
}

function getMemberName(id: string): string {
  return annotationStore.getMemberById(id)?.name || '未指派'
}

function getMemberAvatar(id: string): string {
  return annotationStore.getMemberById(id)?.avatar || '👤'
}

function getMemberColor(id: string): string {
  return annotationStore.getMemberById(id)?.color || '#909399'
}

function isOverdue(ann: Annotation): boolean {
  if (!ann.deadline || ann.status === 'resolved') return false
  return new Date(ann.deadline) < new Date()
}

function formatDeadline(date: string): string {
  try {
    const d = new Date(date)
    return d.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return date
  }
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
    priority: newAnnotation.priority,
    assigneeId: newAnnotation.assigneeId,
    riskLevel: newAnnotation.riskLevel,
    deadline: newAnnotation.deadline,
  })
  resetAddForm()
}

function startEdit(ann: Annotation) {
  editingId.value = ann.id
  editingContent.value = ann.content
  editingPriority.value = ann.priority
  editingAssigneeId.value = ann.assigneeId
  editingRiskLevel.value = ann.riskLevel
  editingDeadline.value = ann.deadline
}

function cancelEdit() {
  editingId.value = null
  editingContent.value = ''
}

function onSaveEdit(id: string) {
  if (!editingContent.value.trim()) return
  annotationStore.updateAnnotation(id, {
    content: editingContent.value.trim(),
    priority: editingPriority.value,
    assigneeId: editingAssigneeId.value,
    riskLevel: editingRiskLevel.value,
    deadline: editingDeadline.value,
  })
  cancelEdit()
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

.stats-section {
  padding: 0 16px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.stat-card {
  background: #fafafa;
  border-radius: 6px;
  padding: 8px 6px;
  text-align: center;
  border: 1px solid #e8e8e8;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 10px;
  color: #909399;
  margin-top: 2px;
}

.stat-pending .stat-value { color: #909399; }
.stat-progress .stat-value { color: #409EFF; }
.stat-resolved .stat-value { color: #67C23A; }
.stat-overdue .stat-value { color: #F56C6C; }
.stat-risk .stat-value { color: #E6A23C; }

.stats-detail {
  background: #fff;
  border-radius: 6px;
  padding: 8px 10px;
  border: 1px solid #f0f0f0;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.stat-row-label {
  color: #909399;
  flex-shrink: 0;
}

.filter-section {
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
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

.annotation-item.is-overdue {
  border-color: #f56c6c;
  background: #fef0f0;
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
  margin-bottom: 6px;
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

.ann-footer {
  margin-top: 6px;
}

.ann-meta {
  font-size: 11px;
  color: #909399;
}

.ann-meta.overdue-text {
  color: #F56C6C;
  font-weight: 500;
}

.ann-edited {
  font-size: 10px;
  color: #C0C4CC;
  margin-left: 4px;
}

.ann-time {
  font-size: 11px;
  color: #909399;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}
</style>
