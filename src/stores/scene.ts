import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Scene, ValidationError } from '@/types'

const genId = () => Math.random().toString(36).slice(2, 10)
const STORAGE_KEY = 'shadow-puppet-stage'

function createDefaultScenes(): Scene[] {
  return [
    {
      id: genId(),
      sceneNumber: '第一场',
      performable: false,
      duration: 120,
      cues: [],
    },
  ]
}

interface StorageData {
  scenes: Scene[]
  version: number
  savedAt?: string
}

function loadFromStorage(): { scenes: Scene[]; savedAt?: string } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data: StorageData = JSON.parse(saved)
      if (data.scenes && Array.isArray(data.scenes) && data.scenes.length > 0) {
        return { scenes: data.scenes, savedAt: data.savedAt }
      }
    }
  } catch (e) {
    console.warn('[AutoRestore] Failed to load from storage:', e)
  }
  return null
}

function saveToStorage(scenes: Scene[]) {
  try {
    const data = {
      scenes,
      version: 1,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[AutoSave] Failed to save to storage:', e)
  }
}

export const useSceneStore = defineStore('scene', () => {
  const savedData = loadFromStorage()
  const initialScenes = savedData?.scenes || createDefaultScenes()
  
  const scenes = ref<Scene[]>(initialScenes)
  const currentSceneId = ref<string>(initialScenes[0].id)
  const validationErrors = ref<ValidationError[]>([])
  const autoSaveEnabled = ref(true)
  const lastSavedAt = ref<string | null>(savedData?.savedAt ?? null)

  let autoSaveTimer: number | null = null

  function scheduleAutoSave() {
    if (!autoSaveEnabled.value) return
    if (autoSaveTimer !== null) {
      clearTimeout(autoSaveTimer)
    }
    autoSaveTimer = window.setTimeout(() => {
      saveToStorage(scenes.value)
      lastSavedAt.value = new Date().toISOString()
      console.log('[AutoSave] Saved automatically at', new Date().toLocaleTimeString())
    }, 1000)
  }

  function restoreFromStorage(): { ok: boolean; message?: string } {
    const saved = loadFromStorage()
    if (saved) {
      scenes.value = [...saved.scenes]
      if (saved.scenes.length > 0) {
        currentSceneId.value = saved.scenes[0].id
      }
      lastSavedAt.value = saved.savedAt ?? new Date().toISOString()
      return { ok: true, message: `已恢复 ${saved.scenes.length} 个场次` }
    }
    return { ok: false, message: '没有找到已保存的编排' }
  }

  function clearSavedData() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      lastSavedAt.value = null
      return { ok: true }
    } catch (e) {
      return { ok: false, message: '清除失败' }
    }
  }

  watch(
    () => scenes.value.map((s) => `${s.id}:${s.sceneNumber}:${s.performable}:${s.duration}:${s.cues.length}:${s.cues.map((c) => c.time).join(',')}`).join('|'),
    () => {
      scheduleAutoSave()
    },
    { deep: true }
  )

  const currentScene = computed(() =>
    scenes.value.find((s) => s.id === currentSceneId.value)
  )

  const sceneNumberMap = computed(() => {
    const map = new Map<string, string>()
    scenes.value.forEach((s) => map.set(s.sceneNumber, s.id))
    return map
  })

  function isSceneNumberUnique(number: string, excludeId?: string): boolean {
    for (const s of scenes.value) {
      if (s.sceneNumber === number && s.id !== excludeId) return false
    }
    return true
  }

  function createScene() {
    let num = scenes.value.length + 1
    let number = `第${num}场`
    while (!isSceneNumberUnique(number)) {
      num++
      number = `第${num}场`
    }
    const scene: Scene = {
      id: genId(),
      sceneNumber: number,
      performable: false,
      duration: 120,
      cues: [],
    }
    scenes.value.push(scene)
    currentSceneId.value = scene.id
    return scene
  }

  function removeScene(id: string) {
    if (scenes.value.length <= 1) return
    const idx = scenes.value.findIndex((s) => s.id === id)
    if (idx > -1) {
      scenes.value.splice(idx, 1)
      if (currentSceneId.value === id) {
        currentSceneId.value = scenes.value[Math.max(0, idx - 1)].id
      }
    }
  }

  function setCurrentScene(id: string) {
    if (scenes.value.some((s) => s.id === id)) {
      currentSceneId.value = id
    }
  }

  function updateSceneNumber(id: string, number: string) {
    const scene = scenes.value.find((s) => s.id === id)
    if (!scene) return { ok: false, message: '场次不存在' }
    if (!isSceneNumberUnique(number, id)) {
      return { ok: false, message: '场次编号已存在，请使用唯一编号（R1）' }
    }
    scene.sceneNumber = number
    return { ok: true }
  }

  function updateSceneDuration(id: string, duration: number) {
    const scene = scenes.value.find((s) => s.id === id)
    if (scene) scene.duration = Math.max(10, duration)
  }

  function canMarkPerformable(scene: Scene): { ok: boolean; reason?: string } {
    const hasSound = scene.cues.some((c) => c.trackType === 'sound')
    const hasBackdrop = scene.cues.some((c) => c.trackType === 'backdrop')
    if (!hasSound || !hasBackdrop) {
      const missing = []
      if (!hasSound) missing.push('锣鼓音效')
      if (!hasBackdrop) missing.push('幕景')
      return { ok: false, reason: `缺少：${missing.join('、')}（R5）` }
    }
    return { ok: true }
  }

  function setPerformable(id: string, performable: boolean) {
    const scene = scenes.value.find((s) => s.id === id)
    if (!scene) return
    if (performable) {
      const check = canMarkPerformable(scene)
      if (!check.ok) {
        scene.performable = false
        return { ok: false, message: check.reason }
      }
    }
    scene.performable = performable
    return { ok: true }
  }

  function setErrors(errors: ValidationError[]) {
    validationErrors.value = errors
  }

  function replaceAllScenes(newScenes: Scene[]) {
    if (!newScenes || newScenes.length === 0) return { ok: false, message: '导入数据为空' }
    const idMap = new Map<string, string>()
    const imported: Scene[] = newScenes.map((s) => {
      const newId = genId()
      idMap.set(s.id, newId)
      return {
        ...s,
        id: newId,
        cues: s.cues.map((c) => ({
          ...c,
          id: genId(),
          sceneId: newId,
        })),
      }
    })
    const seenNumbers = new Set<string>()
    for (const s of imported) {
      if (seenNumbers.has(s.sceneNumber)) {
        return { ok: false, message: `导入数据中场次编号 "${s.sceneNumber}" 重复（R1）` }
      }
      seenNumbers.add(s.sceneNumber)
    }
    scenes.value = [...imported]
    currentSceneId.value = imported[0].id
    return { ok: true, count: imported.length }
  }

  return {
    scenes,
    currentSceneId,
    currentScene,
    validationErrors,
    autoSaveEnabled,
    lastSavedAt,
    sceneNumberMap,
    isSceneNumberUnique,
    createScene,
    removeScene,
    setCurrentScene,
    updateSceneNumber,
    updateSceneDuration,
    canMarkPerformable,
    setPerformable,
    setErrors,
    replaceAllScenes,
    restoreFromStorage,
    clearSavedData,
    scheduleAutoSave,
  }
})
