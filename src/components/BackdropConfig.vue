<template>
  <n-space vertical size="medium">
    <div class="config-row">
      <n-text depth="2" style="font-size: 12px;">幕景选择</n-text>
      <n-select
        v-model:value="selectedResourceId"
        :options="backdropOptions"
        placeholder="选择幕景"
        size="small"
        @update:value="onResourceChange"
      />
    </div>

    <div v-if="selectedBackdrop" class="backdrop-preview">
      <div class="preview-icon">{{ selectedBackdrop.icon }}</div>
      <n-text strong>{{ selectedBackdrop.name }}</n-text>
      <n-text depth="3" style="font-size: 11px;">当前幕景</n-text>
    </div>

    <n-divider style="margin: 0;" />

    <div class="config-row">
      <n-text depth="2" style="font-size: 12px;">快速选择</n-text>
      <div class="backdrop-grid">
        <button
          v-for="b in resourceStore.backdrops"
          :key="b.id"
          class="backdrop-cell"
          :class="{ active: b.id === selectedResourceId }"
          @click="selectedResourceId = b.id"
        >
          <span class="cell-icon">{{ b.icon }}</span>
          <span class="cell-name">{{ b.name }}</span>
        </button>
      </div>
    </div>
  </n-space>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NDivider, NSelect, NSpace, NText } from 'naive-ui'
import { useTimelineStore } from '@/stores/timeline'
import { useResourceStore } from '@/stores/resource'

const timelineStore = useTimelineStore()
const resourceStore = useResourceStore()

const selectedResourceId = computed({
  get: () => timelineStore.selectedCue?.resourceId ?? '',
  set: (v) => {
    if (timelineStore.selectedCue && v !== undefined) {
      timelineStore.updateCue(timelineStore.selectedCue.id, { resourceId: v })
    }
  },
})

const selectedBackdrop = computed(() =>
  selectedResourceId.value ? resourceStore.getResourceById(selectedResourceId.value) : null
)

const backdropOptions = computed(() =>
  resourceStore.backdrops.map((r) => ({
    label: `${r.icon} ${r.name}`,
    value: r.id,
  }))
)

function onResourceChange(v: string | null) {
  if (v !== undefined && timelineStore.selectedCue) {
    timelineStore.updateCue(timelineStore.selectedCue.id, { resourceId: v ?? '' })
  }
}
</script>

<style scoped>
.config-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.backdrop-preview {
  padding: 16px;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-radius: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.preview-icon {
  font-size: 48px;
  margin-bottom: 4px;
}

.backdrop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.backdrop-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 3px solid #3498db;
}

.backdrop-cell:hover {
  border-color: #c0392b;
  transform: translateY(-1px);
}

.backdrop-cell.active {
  background: #e8f4fd;
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
}

.cell-icon {
  font-size: 22px;
}

.cell-name {
  font-size: 11px;
  color: #606266;
}
</style>
