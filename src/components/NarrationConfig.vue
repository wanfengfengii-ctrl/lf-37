<template>
  <n-space vertical size="medium">
    <div class="config-row">
      <n-space align="center" justify="space-between">
        <n-text depth="2" style="font-size: 12px;">旁白内容</n-text>
        <n-tag size="tiny" :bordered="false" type="info">{{ charCount }}字</n-tag>
      </n-space>
      <n-input
        v-model:value="text"
        type="textarea"
        :rows="6"
        placeholder="在此输入旁白台词..."
        autosize
        @update:value="onTextChange"
      />
    </div>

    <div class="config-row">
      <n-text depth="2" style="font-size: 12px;">快速模板</n-text>
      <n-space size="small" wrap>
        <n-button size="tiny" v-for="tpl in templates" :key="tpl.label" @click="text = tpl.text">
          {{ tpl.label }}
        </n-button>
      </n-space>
    </div>

    <n-alert type="warning" :show-icon="false" size="small" v-if="charCount > 200">
      旁白过长，请注意演出节奏
    </n-alert>
  </n-space>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton, NInput, NSpace, NTag, NText } from 'naive-ui'
import { useTimelineStore } from '@/stores/timeline'

const timelineStore = useTimelineStore()

const templates = [
  { label: '开场', text: '话说天下大势，分久必合，合久必分。' },
  { label: '转折', text: '正在此时，忽听得远处马蹄声阵阵...' },
  { label: '打斗', text: '二人大战三百回合，难分胜负！' },
  { label: '落幕', text: '欲知后事如何，且听下回分解。' },
]

const text = computed({
  get: () => timelineStore.selectedCue?.narration ?? '',
  set: (v) => {
    if (timelineStore.selectedCue) {
      timelineStore.updateCue(timelineStore.selectedCue.id, { narration: v })
    }
  },
})

const charCount = computed(() => (text.value?.length ?? 0))

function onTextChange(v: string) {
  if (timelineStore.selectedCue) {
    timelineStore.updateCue(timelineStore.selectedCue.id, { narration: v })
  }
}
</script>

<style scoped>
.config-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
