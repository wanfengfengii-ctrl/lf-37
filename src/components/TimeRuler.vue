<template>
  <div class="time-ruler" ref="rulerRef">
    <div class="ruler-inner" :style="{ width: totalWidth + 'px' }">
      <div
        v-for="mark in majorMarks"
        :key="mark.key"
        class="ruler-mark major"
        :style="{ left: mark.x + 'px' }"
      >
        <div class="mark-label">{{ mark.label }}</div>
        <div class="mark-line major-line" />
      </div>
      <div
        v-for="mark in minorMarks"
        :key="mark.key"
        class="ruler-mark minor"
        :style="{ left: mark.x + 'px' }"
      >
        <div class="mark-line minor-line" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  duration: number
  pxPerSecond: number
}>()

const rulerRef = ref<HTMLElement | null>(null)

const totalWidth = computed(() => props.duration * props.pxPerSecond)

const majorMarks = computed(() => {
  const marks: { x: number; label: string; key: string }[] = []
  const step = props.duration > 600 ? 60 : props.duration > 240 ? 30 : props.duration > 120 ? 15 : 10
  for (let t = 0; t <= props.duration; t += step) {
    const m = Math.floor(t / 60)
    const s = t % 60
    marks.push({
      x: t * props.pxPerSecond,
      label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      key: `major-${t}`,
    })
  }
  return marks
})

const minorMarks = computed(() => {
  const marks: { x: number; key: string }[] = []
  const step = props.duration > 600 ? 10 : props.duration > 240 ? 5 : props.duration > 120 ? 3 : 2
  for (let t = 0; t <= props.duration; t += step) {
    marks.push({
      x: t * props.pxPerSecond,
      key: `minor-${t}`,
    })
  }
  return marks
})

defineExpose({ rulerRef })
</script>

<style scoped>
.time-ruler {
  width: 100%;
  height: 40px;
  background: linear-gradient(180deg, #f8f9fa 0%, #eef0f3 100%);
  border-bottom: 1px solid #dcdfe6;
  position: sticky;
  top: 0;
  z-index: 5;
  overflow: hidden;
}

.ruler-inner {
  position: relative;
  height: 100%;
}

.ruler-mark {
  position: absolute;
  top: 0;
  height: 100%;
}

.mark-label {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 11px;
  color: #606266;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  white-space: nowrap;
}

.mark-line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 1px;
}

.major-line {
  height: 14px;
  background: #909399;
}

.minor-line {
  height: 7px;
  background: #c0c4cc;
}
</style>
