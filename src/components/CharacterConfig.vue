<template>
  <n-space vertical size="medium">
    <div class="config-row">
      <n-text depth="2" style="font-size: 12px;">皮影角色</n-text>
      <n-select
        v-model:value="selectedResourceId"
        :options="charOptions"
        placeholder="选择角色"
        size="small"
        @update:value="onResourceChange"
      />
    </div>

    <div class="config-row">
      <n-text depth="2" style="font-size: 12px;">幕位</n-text>
      <div class="stage-grid">
        <button
          class="stage-cell"
          :class="{ active: position === 'upper' }"
          @click="position = 'upper'"
        >
          <span>上幕位</span>
        </button>
        <button
          class="stage-cell"
          :class="{ active: position === 'left' }"
          @click="position = 'left'"
        >
          <span>左幕位</span>
        </button>
        <button
          class="stage-cell center"
          :class="{ active: position === 'center' }"
          @click="position = 'center'"
        >
          <span>中幕位</span>
        </button>
        <button
          class="stage-cell"
          :class="{ active: position === 'right' }"
          @click="position = 'right'"
        >
          <span>右幕位</span>
        </button>
        <button
          class="stage-cell"
          :class="{ active: position === 'lower' }"
          @click="position = 'lower'"
        >
          <span>下幕位</span>
        </button>
      </div>
    </div>

    <n-alert v-if="isConflict" type="error" :show-icon="true" size="small">
      ⚠️ 此角色与其他 cue 点存在幕位冲突（R2）
    </n-alert>
  </n-space>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NIcon, NSelect, NSpace, NText } from 'naive-ui'
import { useTimelineStore } from '@/stores/timeline'
import { useResourceStore } from '@/stores/resource'
import type { StagePosition } from '@/types'

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

const position = computed({
  get: () => (timelineStore.selectedCue?.position as StagePosition) ?? 'center',
  set: (v: StagePosition) => {
    if (timelineStore.selectedCue) {
      timelineStore.updateCue(timelineStore.selectedCue.id, { position: v })
    }
  },
})

const isConflict = computed(() =>
  timelineStore.selectedCue ? timelineStore.isCueInConflict(timelineStore.selectedCue.id) : false
)

const charOptions = computed(() =>
  resourceStore.characters.map((r) => ({
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

.stage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 40px 40px 40px;
  gap: 4px;
  background: #f5f0eb;
  padding: 8px;
  border-radius: 10px;
  border: 1px dashed #d4a574;
}

.stage-cell {
  border: 1px solid #d4a574;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 11px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-cell:hover {
  border-color: #c0392b;
  color: #c0392b;
}

.stage-cell.active {
  background: #c0392b;
  border-color: #c0392b;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(192, 57, 43, 0.3);
}

.stage-cell.center {
  grid-column: 2;
  grid-row: 2;
  font-weight: 600;
}

.stage-cell:nth-child(1) { grid-column: 2; grid-row: 1; }
.stage-cell:nth-child(2) { grid-column: 1; grid-row: 2; }
.stage-cell:nth-child(3) { } /* defined above */
.stage-cell:nth-child(4) { grid-column: 3; grid-row: 2; }
.stage-cell:nth-child(5) { grid-column: 2; grid-row: 3; }
</style>
