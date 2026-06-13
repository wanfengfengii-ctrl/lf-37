<template>
  <div class="scene-bar">
    <n-scrollbar x-scrollable>
      <div class="scene-list">
        <div
          v-for="scene in sceneStore.scenes"
          :key="scene.id"
          class="scene-tab"
          :class="{ active: scene.id === sceneStore.currentSceneId }"
          @click="sceneStore.setCurrentScene(scene.id)"
        >
          <div class="scene-num">
            <n-input
              v-if="editingId === scene.id"
              :value="scene.sceneNumber"
              size="tiny"
              :show-button="false"
              style="width: 80px;"
              @blur="submitEdit(scene.id, $event)"
              @keyup.enter="submitEdit(scene.id, $event)"
              ref="editInputRef"
            />
            <span v-else @dblclick="startEdit(scene.id)">{{ scene.sceneNumber }}</span>
          </div>

          <n-space size="small" align="center">
            <n-tag
              size="tiny"
              round
              :type="scene.performable ? 'success' : 'default'"
              :bordered="false"
              @click.stop="togglePerformable(scene)"
              style="cursor: pointer;"
            >
              {{ scene.performable ? '✓ 可演出' : '待完善' }}
            </n-tag>
            <n-text depth="3" style="font-size: 11px;">
              {{ scene.cues.length }} cues
            </n-text>
            <n-button
              text
              size="tiny"
              @click.stop="onDelete(scene)"
              :disabled="sceneStore.scenes.length <= 1"
            >
              <template #icon><n-icon size="14"><component :is="DeleteOutlined" /></n-icon></template>
            </n-button>
          </n-space>
        </div>

        <button class="add-scene-btn" @click="sceneStore.createScene">
          <n-icon><component :is="PlusOutlined" /></n-icon>
          <span>新增场次</span>
        </button>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { NButton, NIcon, NInput, NSpace, NTag, NText, useMessage, useDialog } from 'naive-ui'
import { PlusOutlined, DeleteOutlined } from '@vicons/antd'
import { useSceneStore } from '@/stores/scene'
import type { Scene } from '@/types'

const sceneStore = useSceneStore()
const message = useMessage()
const dialog = useDialog()

const editingId = ref<string | null>(null)
const editInputRef = ref<any>(null)

function startEdit(id: string) {
  editingId.value = id
  nextTick(() => {
    const el = editInputRef.value
    if (el) {
      const input = (el as any).$el?.querySelector('input') || (el as any).querySelector?.('input')
      input?.focus?.()
      input?.select?.()
    }
  })
}

function submitEdit(id: string, e: any) {
  const val = (e.target as HTMLInputElement)?.value?.trim()
  if (val) {
    const res = sceneStore.updateSceneNumber(id, val)
    if (!res.ok) {
      message.error(res.message || '编号无效')
    }
  }
  editingId.value = null
}

function togglePerformable(scene: Scene) {
  if (!scene.performable) {
    const res = sceneStore.canMarkPerformable(scene)
    if (!res.ok) {
      dialog.warning({
        title: '无法标记为可演出',
        content: res.reason || '场次不完整',
        positiveText: '我知道了',
      })
      return
    }
  }
  sceneStore.setPerformable(scene.id, !scene.performable)
  message.success(scene.performable ? '已取消可演出标记' : '已标记为可演出')
}

function onDelete(scene: Scene) {
  dialog.warning({
    title: '删除场次',
    content: `确定要删除"${scene.sceneNumber}"吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      sceneStore.removeScene(scene.id)
      message.success('已删除场次')
    },
  })
}
</script>

<style scoped>
.scene-bar {
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
  padding: 8px 12px;
  min-height: 58px;
}

.scene-list {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
}

.scene-tab {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 140px;
  border-top: 3px solid transparent;
}

.scene-tab:hover {
  border-color: #c0392b;
}

.scene-tab.active {
  border-color: #c0392b;
  border-top-color: #c0392b;
  background: #fff9f9;
  box-shadow: 0 2px 8px rgba(192, 57, 43, 0.15);
}

.scene-num {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.add-scene-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 1px dashed #c0392b;
  background: transparent;
  border-radius: 8px;
  color: #c0392b;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.add-scene-btn:hover {
  background: #c0392b;
  color: #fff;
}
</style>
