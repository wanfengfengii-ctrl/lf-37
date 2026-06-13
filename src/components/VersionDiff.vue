<template>
  <div class="version-diff">
    <div v-if="groupedDiffs.character.length > 0" class="diff-group">
      <div class="group-header">
        <span class="group-icon">🎭</span>
        <n-text strong style="font-size: 12px;">角色走位</n-text>
        <n-tag size="tiny" :bordered="false" round>{{ groupedDiffs.character.length }}</n-tag>
      </div>
      <div v-for="(d, i) in groupedDiffs.character" :key="'c' + i" class="diff-item" :class="changeClass(d.changeType)">
        <span class="change-badge">{{ changeLabel(d.changeType) }}</span>
        <span class="diff-desc">{{ d.description }}</span>
      </div>
    </div>

    <div v-if="groupedDiffs.backdrop.length > 0" class="diff-group">
      <div class="group-header">
        <span class="group-icon">🏞️</span>
        <n-text strong style="font-size: 12px;">幕景切换</n-text>
        <n-tag size="tiny" :bordered="false" round>{{ groupedDiffs.backdrop.length }}</n-tag>
      </div>
      <div v-for="(d, i) in groupedDiffs.backdrop" :key="'b' + i" class="diff-item" :class="changeClass(d.changeType)">
        <span class="change-badge">{{ changeLabel(d.changeType) }}</span>
        <span class="diff-desc">{{ d.description }}</span>
      </div>
    </div>

    <div v-if="groupedDiffs.lighting.length > 0" class="diff-group">
      <div class="group-header">
        <span class="group-icon">💡</span>
        <n-text strong style="font-size: 12px;">灯光</n-text>
        <n-tag size="tiny" :bordered="false" round>{{ groupedDiffs.lighting.length }}</n-tag>
      </div>
      <div v-for="(d, i) in groupedDiffs.lighting" :key="'l' + i" class="diff-item" :class="changeClass(d.changeType)">
        <span class="change-badge">{{ changeLabel(d.changeType) }}</span>
        <span class="diff-desc">{{ d.description }}</span>
      </div>
    </div>

    <div v-if="groupedDiffs.sound.length > 0" class="diff-group">
      <div class="group-header">
        <span class="group-icon">🥁</span>
        <n-text strong style="font-size: 12px;">音效</n-text>
        <n-tag size="tiny" :bordered="false" round>{{ groupedDiffs.sound.length }}</n-tag>
      </div>
      <div v-for="(d, i) in groupedDiffs.sound" :key="'s' + i" class="diff-item" :class="changeClass(d.changeType)">
        <span class="change-badge">{{ changeLabel(d.changeType) }}</span>
        <span class="diff-desc">{{ d.description }}</span>
      </div>
    </div>

    <div v-if="groupedDiffs.narration.length > 0" class="diff-group">
      <div class="group-header">
        <span class="group-icon">📝</span>
        <n-text strong style="font-size: 12px;">旁白</n-text>
        <n-tag size="tiny" :bordered="false" round>{{ groupedDiffs.narration.length }}</n-tag>
      </div>
      <div v-for="(d, i) in groupedDiffs.narration" :key="'n' + i" class="diff-item" :class="changeClass(d.changeType)">
        <span class="change-badge">{{ changeLabel(d.changeType) }}</span>
        <span class="diff-desc">{{ d.description }}</span>
      </div>
    </div>

    <div v-if="diffs.length === 0" class="no-diff">
      <n-text depth="3" style="font-size: 12px;">两个版本完全一致，无差异</n-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NTag, NText } from 'naive-ui'
import type { VersionDiffItem, TrackType } from '@/types'

const props = defineProps<{
  diffs: VersionDiffItem[]
}>()

const groupedDiffs = computed(() => {
  const groups: Record<TrackType, VersionDiffItem[]> = {
    character: [],
    lighting: [],
    sound: [],
    narration: [],
    backdrop: [],
  }
  for (const d of props.diffs) {
    groups[d.trackType].push(d)
  }
  return groups
})

function changeClass(type: string) {
  return {
    'change-added': type === 'added',
    'change-removed': type === 'removed',
    'change-modified': type === 'modified',
  }
}

function changeLabel(type: string) {
  const map: Record<string, string> = {
    added: '+ 新增',
    removed: '- 删除',
    modified: '~ 变更',
  }
  return map[type] || type
}
</script>

<style scoped>
.version-diff {
  padding: 8px 16px 12px;
  max-height: 300px;
  overflow-y: auto;
}

.diff-group {
  margin-bottom: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #e8e8e8;
}

.group-icon {
  font-size: 14px;
}

.diff-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 8px;
  margin-bottom: 3px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
}

.diff-item.change-added {
  background: #f0f9eb;
}

.diff-item.change-removed {
  background: #fef0f0;
}

.diff-item.change-modified {
  background: #fdf6ec;
}

.change-badge {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 11px;
  min-width: 48px;
}

.change-added .change-badge {
  color: #67C23A;
}

.change-removed .change-badge {
  color: #F56C6C;
}

.change-modified .change-badge {
  color: #E6A23C;
}

.diff-desc {
  color: #303133;
  word-break: break-all;
}

.no-diff {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}
</style>
