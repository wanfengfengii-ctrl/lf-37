<template>
  <div class="validation-badge" @click="showDetail">
    <n-tooltip trigger="hover" placement="bottom" :disabled="errorCount === 0">
      <template #trigger>
        <n-badge :value="errorCount" :max="99" :show="errorCount > 0">
          <n-tag :type="tagType" :bordered="false" round size="small">
            <template #icon>
              <n-icon size="14">
                <component :is="tagIcon" />
              </n-icon>
            </template>
            {{ tagText }}
          </n-tag>
        </n-badge>
      </template>
      <span>存在 {{ errorCount }} 个问题，点击查看详情</span>
    </n-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { NBadge, NIcon, NTag, NTooltip, useDialog } from 'naive-ui'
import { CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined } from '@vicons/antd'
import { useSceneStore } from '@/stores/scene'
import { validateAll } from '@/composables/useValidator'

const sceneStore = useSceneStore()
const dialog = useDialog()

const errors = computed(() => {
  const result = validateAll(sceneStore.scenes, sceneStore.currentScene)
  sceneStore.setErrors(result.errors)
  return result.errors
})

const errorCount = computed(() => errors.value.length)
const hasWarnings = computed(() => {
  if (!sceneStore.currentScene) return true
  return !sceneStore.currentScene.performable
})

const tagType = computed(() => {
  if (errorCount.value > 0) return 'error'
  if (hasWarnings.value) return 'warning'
  return 'success'
})

const tagIcon = computed(() => {
  if (errorCount.value > 0) return ExclamationCircleOutlined
  if (hasWarnings.value) return WarningOutlined
  return CheckCircleOutlined
})

const tagText = computed(() => {
  if (errorCount.value > 0) return `${errorCount.value} 项校验失败`
  if (hasWarnings.value) return '未标记可演出'
  return '校验通过'
})

function showDetail() {
  dialog.warning({
    title: '校验结果',
    positiveText: '知道了',
    content: () => {
      if (errors.value.length === 0) {
        return h('div', { style: { padding: '8px 0' } }, [
          h('div', { style: { color: '#18a058' } }, '✓ 所有规则校验通过'),
          hasWarnings.value
            ? h('div', { style: { color: '#f0a020', marginTop: 8 } }, '⚠ 场次尚未标记为"可演出"')
            : null,
        ])
      }
      return h(
        'div',
        { style: { maxHeight: '60vh', overflow: 'auto' } },
        errors.value.map((e, i) =>
          h('div', {
            key: i,
            style: {
              padding: '8px 10px',
              marginBottom: 6,
              borderRadius: 6,
              background: '#fff5f5',
              borderLeft: '3px solid #d03050',
              fontSize: 13,
            },
          }, [
            h('span', { style: { fontWeight: 600, color: '#d03050', marginRight: 6 } }, `[${e.rule}]`),
            h('span', {}, e.message),
          ])
        )
      )
    },
  })
}
</script>

<style scoped>
.validation-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
</style>
