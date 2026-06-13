<template>
  <n-space vertical size="small" class="resource-panel">
    <div class="panel-header">
      <n-text strong depth="1" style="font-size: 15px;">资源库</n-text>
    </div>

    <n-input
      v-model:value="store.searchKeyword"
      placeholder="搜索资源..."
      clearable
      size="small"
    >
      <template #prefix>
        <n-icon><component :is="SearchOutlined" /></n-icon>
      </template>
    </n-input>

    <n-radio-group v-model:value="store.filterType" size="small">
      <n-radio-button value="all">全部</n-radio-button>
      <n-radio-button value="character">角色</n-radio-button>
      <n-radio-button value="backdrop">幕景</n-radio-button>
      <n-radio-button value="sound">音效</n-radio-button>
    </n-radio-group>

    <div class="resource-section">
      <n-divider style="margin: 4px 0;">
        <n-tag size="small" type="error" round>🎭 角色</n-tag>
      </n-divider>
      <div class="resource-grid">
        <div
          v-for="r in store.characters.filter(c => matchFilter(c))"
          :key="r.id"
          class="resource-card"
          draggable="true"
          @dragstart="onDragStart($event, r, 'character')"
        >
          <div class="resource-icon">{{ r.icon }}</div>
          <div class="resource-name">{{ r.name }}</div>
        </div>
      </div>
    </div>

    <div class="resource-section">
      <n-divider style="margin: 4px 0;">
        <n-tag size="small" type="info" round>🏞️ 幕景</n-tag>
      </n-divider>
      <div class="resource-grid">
        <div
          v-for="r in store.backdrops.filter(c => matchFilter(c))"
          :key="r.id"
          class="resource-card backdrop-card"
          draggable="true"
          @dragstart="onDragStart($event, r, 'backdrop')"
        >
          <div class="resource-icon">{{ r.icon }}</div>
          <div class="resource-name">{{ r.name }}</div>
        </div>
      </div>
    </div>

    <div class="resource-section">
      <n-divider style="margin: 4px 0;">
        <n-tag size="small" type="warning" round>🥁 锣鼓</n-tag>
      </n-divider>
      <div class="resource-grid">
        <div
          v-for="r in store.sounds.filter(c => matchFilter(c))"
          :key="r.id"
          class="resource-card sound-card"
          draggable="true"
          @dragstart="onDragStart($event, r, 'sound')"
        >
          <div class="resource-icon">{{ r.icon }}</div>
          <div class="resource-name">{{ r.name }}</div>
        </div>
      </div>
    </div>

    <n-button block size="small" dashed @click="onAddCustomCue">
      <template #icon><n-icon><component :is="PlusOutlined" /></n-icon></template>
      添加旁白/灯光 cue
    </n-button>
  </n-space>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { NButton, NDivider, NIcon, NInput, NRadioButton, NRadioGroup, NSpace, NTag, NText, useDialog, useMessage } from 'naive-ui'
import { SearchOutlined, PlusOutlined } from '@vicons/antd'
import { useResourceStore } from '@/stores/resource'
import { useTimelineStore } from '@/stores/timeline'
import { useSceneStore } from '@/stores/scene'
import type { Resource, TrackType } from '@/types'

const store = useResourceStore()
const timelineStore = useTimelineStore()
const sceneStore = useSceneStore()
const message = useMessage()
const dialog = useDialog()

function matchFilter(r: Resource) {
  if (store.filterType.value === 'all') return true
  return r.type === store.filterType.value
}

function onDragStart(e: DragEvent, resource: Resource, trackType: TrackType) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify({
      resourceId: resource.id,
      resourceName: resource.name,
      trackType,
      type: 'resource',
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }
}

function onAddCustomCue() {
  const scene = sceneStore.currentScene
  if (!scene) return
  const selectedTrack = ref<'lighting' | 'narration'>('lighting')

  const content = () => h('div', { style: { padding: '12px 0' } }, [
    h('div', { style: { marginBottom: 8 } }, '请选择要添加的 cue 类型：'),
    h(NRadioGroup, {
      value: selectedTrack.value,
      'onUpdate:value': (v: 'lighting' | 'narration') => {
        selectedTrack.value = v
      },
    }, {
      default: () => [
        h(NRadioButton, { value: 'lighting' }, { default: () => '💡 灯光' }),
        h(NRadioButton, { value: 'narration' }, { default: () => '📝 旁白' }),
      ],
    }),
  ])

  dialog.warning({
    title: '选择 cue 类型',
    content,
    positiveText: '添加',
    negativeText: '取消',
    onPositiveClick: () => {
      const track = selectedTrack.value
      const midTime = sceneStore.currentScene ? sceneStore.currentScene.duration / 2 : 60
      const cue = timelineStore.addCue({
        trackType: track as TrackType,
        time: midTime,
        brightness: track === 'lighting' ? 80 : 0,
        narration: track === 'narration' ? '（在此输入旁白文字）' : '',
      })
      if (cue) {
        timelineStore.selectCue(cue.id)
        message.success('已添加 cue 点，请在右侧面板调整参数')
      }
    },
  })
}
</script>

<style scoped>
.resource-panel {
  padding: 12px;
  height: 100%;
  overflow-y: auto;
}

.panel-header {
  padding: 4px 0;
}

.resource-section {
  margin-bottom: 8px;
}

.resource-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.resource-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 10px 6px;
  text-align: center;
  background: #fff;
  transition: all 0.15s ease;
  border-left: 4px solid #e74c3c;
}

.resource-card.backdrop-card {
  border-left-color: #3498db;
}

.resource-card.sound-card {
  border-left-color: #e67e22;
}

.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #c0392b;
}

.resource-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.resource-name {
  font-size: 12px;
  color: #333;
  font-weight: 500;
}
</style>
