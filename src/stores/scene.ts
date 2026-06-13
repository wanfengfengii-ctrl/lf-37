import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Scene, ValidationError } from '@/types'

const genId = () => Math.random().toString(36).slice(2, 10)

export const useSceneStore = defineStore('scene', () => {
  const scenes = ref<Scene[]>([
    {
      id: genId(),
      sceneNumber: '第一场',
      performable: false,
      duration: 120,
      cues: [],
    },
  ])
  const currentSceneId = ref<string>(scenes.value[0].id)
  const validationErrors = ref<ValidationError[]>([])

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
    scenes.value.splice(0, scenes.value.length, ...imported)
    currentSceneId.value = imported[0].id
    return { ok: true, count: imported.length }
  }

  return {
    scenes,
    currentSceneId,
    currentScene,
    validationErrors,
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
  }
})
