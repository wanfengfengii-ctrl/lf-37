import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSceneStore } from './scene'
import { useResourceStore } from './resource'
import type {
  Annotation,
  AnnotationType,
  AnnotationStatus,
  VersionSnapshot,
  VersionDiffItem,
  CuePoint,
  TrackType,
} from '@/types'
import { TRACK_LABELS, POSITION_LABELS } from '@/types'

const genId = () => Math.random().toString(36).slice(2, 10)
const ANNOTATION_KEY = 'shadow-puppet-annotations'
const VERSION_KEY = 'shadow-puppet-versions'

function loadAnnotations(): Annotation[] {
  try {
    const raw = localStorage.getItem(ANNOTATION_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveAnnotations(annotations: Annotation[]) {
  try {
    localStorage.setItem(ANNOTATION_KEY, JSON.stringify(annotations))
  } catch {}
}

function loadVersions(): VersionSnapshot[] {
  try {
    const raw = localStorage.getItem(VERSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveVersions(versions: VersionSnapshot[]) {
  try {
    localStorage.setItem(VERSION_KEY, JSON.stringify(versions))
  } catch {}
}

export const useAnnotationStore = defineStore('annotation', () => {
  const sceneStore = useSceneStore()
  const resourceStore = useResourceStore()

  const annotations = ref<Annotation[]>(loadAnnotations())
  const versionSnapshots = ref<VersionSnapshot[]>(loadVersions())

  const showVersionPanel = ref(false)
  const showAnnotationPanel = ref(true)
  const compareVersionIds = ref<[string, string] | null>(null)

  function persistAnnotations() {
    saveAnnotations(annotations.value)
  }

  function persistVersions() {
    saveVersions(versionSnapshots.value)
  }

  const sceneAnnotations = computed(() => {
    const sceneId = sceneStore.currentSceneId
    return annotations.value.filter((a) => a.sceneId === sceneId)
  })

  const cueAnnotations = computed(() => {
    const sceneId = sceneStore.currentSceneId
    return (cueId: string) =>
      annotations.value.filter((a) => a.sceneId === sceneId && a.cueId === cueId)
  })

  const pendingRiskCount = computed(() =>
    annotations.value.filter((a) => a.type === 'risk' && a.status !== 'resolved').length
  )

  const unresolvedCount = computed(() =>
    annotations.value.filter((a) => a.status !== 'resolved').length
  )

  function getAnnotationsForTime(time: number): Annotation[] {
    const sceneId = sceneStore.currentSceneId
    const scene = sceneStore.currentScene
    if (!scene) return []

    const timeWindow = 3.0
    const relevantCueIds = scene.cues
      .filter((c) => Math.abs(c.time - time) <= timeWindow)
      .map((c) => c.id)

    return annotations.value.filter(
      (a) =>
        a.sceneId === sceneId &&
        (relevantCueIds.includes(a.cueId ?? '') || !a.cueId)
    )
  }

  function getRiskAnnotationsForTime(time: number): Annotation[] {
    return getAnnotationsForTime(time).filter(
      (a) => a.type === 'risk' && a.status !== 'resolved'
    )
  }

  function addAnnotation(partial: {
    sceneId: string
    cueId?: string
    type: AnnotationType
    content: string
  }) {
    const now = new Date().toISOString()
    const annotation: Annotation = {
      id: genId(),
      sceneId: partial.sceneId,
      cueId: partial.cueId,
      type: partial.type,
      content: partial.content,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    annotations.value.push(annotation)
    persistAnnotations()
    return annotation
  }

  function updateAnnotationStatus(id: string, status: AnnotationStatus) {
    const ann = annotations.value.find((a) => a.id === id)
    if (!ann) return
    ann.status = status
    ann.updatedAt = new Date().toISOString()
    persistAnnotations()
  }

  function removeAnnotation(id: string) {
    const idx = annotations.value.findIndex((a) => a.id === id)
    if (idx > -1) {
      annotations.value.splice(idx, 1)
      persistAnnotations()
    }
  }

  function updateAnnotationContent(id: string, content: string) {
    const ann = annotations.value.find((a) => a.id === id)
    if (!ann) return
    ann.content = content
    ann.updatedAt = new Date().toISOString()
    persistAnnotations()
  }

  function createSnapshot(label?: string) {
    const now = new Date().toISOString()
    const ts = new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    const resourceNames: Record<string, string> = {}
    for (const r of resourceStore.resources) {
      resourceNames[r.id] = r.name
    }
    const snapshot: VersionSnapshot = {
      id: genId(),
      label: label || `版本 ${versionSnapshots.value.length + 1} - ${ts}`,
      scenes: JSON.parse(JSON.stringify(sceneStore.scenes)),
      annotations: JSON.parse(JSON.stringify(annotations.value)),
      resourceNames,
      createdAt: now,
    }
    versionSnapshots.value.push(snapshot)
    persistVersions()
    return snapshot
  }

  function deleteSnapshot(id: string) {
    const idx = versionSnapshots.value.findIndex((v) => v.id === id)
    if (idx > -1) {
      versionSnapshots.value.splice(idx, 1)
      persistVersions()
    }
  }

  function restoreSnapshot(id: string) {
    const snapshot = versionSnapshots.value.find((v) => v.id === id)
    if (!snapshot) return { ok: false, message: '快照不存在' }
    const result = sceneStore.replaceAllScenes(
      JSON.parse(JSON.stringify(snapshot.scenes))
    )
    if (result.ok) {
      annotations.value = JSON.parse(JSON.stringify(snapshot.annotations))
      persistAnnotations()
      return { ok: true }
    }
    return result
  }

  function compareVersions(
    versionIdA: string,
    versionIdB: string
  ): VersionDiffItem[] {
    const vA = versionSnapshots.value.find((v) => v.id === versionIdA)
    const vB = versionSnapshots.value.find((v) => v.id === versionIdB)
    if (!vA || !vB) return []

    const diffs: VersionDiffItem[] = []

    const allSceneIds = new Set<string>()
    const sceneMapA = new Map(vA.scenes.map((s) => [s.id, s]))
    const sceneMapB = new Map(vB.scenes.map((s) => [s.id, s]))
    for (const s of vA.scenes) allSceneIds.add(s.id)
    for (const s of vB.scenes) allSceneIds.add(s.id)

    for (const sceneId of allSceneIds) {
      const sA = sceneMapA.get(sceneId)
      const sB = sceneMapB.get(sceneId)
      const sceneLabel = sA?.sceneNumber || sB?.sceneNumber || sceneId

      if (!sA && sB) {
        diffs.push({
          trackType: 'backdrop',
          changeType: 'added',
          description: `[${sceneLabel}] 场次新增（共 ${sB.cues.length} 个 cue）`,
        })
        continue
      }
      if (sA && !sB) {
        diffs.push({
          trackType: 'backdrop',
          changeType: 'removed',
          description: `[${sceneLabel}] 场次已删除`,
        })
        continue
      }

      if (sA!.duration !== sB!.duration) {
        diffs.push({
          trackType: 'backdrop',
          changeType: 'modified',
          description: `[${sceneLabel}] 时长从 ${sA!.duration}s 变为 ${sB!.duration}s`,
        })
      }

      compareCues(sA!.cues, sB!.cues, sceneLabel, diffs, vA.resourceNames, vB.resourceNames)
    }

    compareAnnotations(vA.annotations, vB.annotations, diffs)

    return diffs
  }

  function compareCues(
    cuesA: CuePoint[],
    cuesB: CuePoint[],
    sceneLabel: string,
    diffs: VersionDiffItem[],
    namesA: Record<string, string>,
    namesB: Record<string, string>
  ) {
    const mapA = new Map(cuesA.map((c) => [c.id, c]))
    const mapB = new Map(cuesB.map((c) => [c.id, c]))

    for (const [id, cB] of mapB) {
      if (!mapA.has(id)) {
        diffs.push({
          trackType: cB.trackType,
          changeType: 'added',
          description: `[${sceneLabel}] 新增${TRACK_LABELS[cB.trackType]} ${describeCue(cB, namesB)} @ ${cB.time.toFixed(1)}s`,
          cueId: id,
        })
      }
    }

    for (const [id, cA] of mapA) {
      if (!mapB.has(id)) {
        diffs.push({
          trackType: cA.trackType,
          changeType: 'removed',
          description: `[${sceneLabel}] 删除${TRACK_LABELS[cA.trackType]} ${describeCue(cA, namesA)} @ ${cA.time.toFixed(1)}s`,
          cueId: id,
        })
      }
    }

    for (const [id, cA] of mapA) {
      const cB = mapB.get(id)
      if (!cB) continue
      const changes: string[] = []
      if (cA.time !== cB.time) changes.push(`时间 ${cA.time.toFixed(1)}s→${cB.time.toFixed(1)}s`)
      if (cA.position !== cB.position)
        changes.push(`位置 ${POSITION_LABELS[cA.position]}→${POSITION_LABELS[cB.position]}`)
      if (cA.brightness !== cB.brightness) changes.push(`亮度 ${cA.brightness}%→${cB.brightness}%`)
      if (cA.volume !== cB.volume) changes.push(`音量 ${cA.volume}%→${cB.volume}%`)
      if (cA.resourceId !== cB.resourceId) {
        const nameA = namesA[cA.resourceId] || describeCue(cA, namesA)
        const nameB = namesB[cB.resourceId] || describeCue(cB, namesB)
        changes.push(`${nameA}→${nameB}`)
      }
      if (cA.narration !== cB.narration) {
        const shortA = cA.narration.length > 8 ? cA.narration.slice(0, 8) + '…' : cA.narration
        const shortB = cB.narration.length > 8 ? cB.narration.slice(0, 8) + '…' : cB.narration
        changes.push(`旁白"${shortA}"→"${shortB}"`)
      }
      if (changes.length > 0) {
        diffs.push({
          trackType: cA.trackType,
          changeType: 'modified',
          description: `[${sceneLabel}] ${TRACK_LABELS[cA.trackType]} ${describeCue(cA, namesA)} ${changes.join('，')}`,
          cueId: id,
        })
      }
    }
  }

  function describeCue(cue: CuePoint, resourceNames?: Record<string, string>): string {
    const resName = resourceNames?.[cue.resourceId]
    switch (cue.trackType) {
      case 'character':
        return resName ? `${resName}(${POSITION_LABELS[cue.position]})` : POSITION_LABELS[cue.position]
      case 'lighting':
        return `亮度${cue.brightness}%`
      case 'sound':
        return resName ? `${resName}(音量${cue.volume}%)` : `音量${cue.volume}%`
      case 'narration':
        return cue.narration?.slice(0, 10) || '旁白'
      case 'backdrop':
        return resName ? `${resName}` : '幕景切换'
      default:
        return ''
    }
  }

  function compareAnnotations(
    annsA: Annotation[],
    annsB: Annotation[],
    diffs: VersionDiffItem[]
  ) {
    const riskA = annsA.filter((a) => a.type === 'risk')
    const riskB = annsB.filter((a) => a.type === 'risk')
    if (riskA.length !== riskB.length) {
      diffs.push({
        trackType: 'backdrop',
        changeType: 'modified',
        description: `风险标记从 ${riskA.length} 条变为 ${riskB.length} 条`,
      })
    }
    const resolvedA = annsA.filter((a) => a.status === 'resolved').length
    const resolvedB = annsB.filter((a) => a.status === 'resolved').length
    if (resolvedA !== resolvedB) {
      diffs.push({
        trackType: 'backdrop',
        changeType: 'modified',
        description: `已处理批注从 ${resolvedA} 条变为 ${resolvedB} 条`,
      })
    }
  }

  function clearCompare() {
    compareVersionIds.value = null
  }

  function startCompare(idA: string, idB: string) {
    compareVersionIds.value = [idA, idB]
  }

  return {
    annotations,
    versionSnapshots,
    showVersionPanel,
    showAnnotationPanel,
    compareVersionIds,
    sceneAnnotations,
    cueAnnotations,
    pendingRiskCount,
    unresolvedCount,
    getAnnotationsForTime,
    getRiskAnnotationsForTime,
    addAnnotation,
    updateAnnotationStatus,
    removeAnnotation,
    updateAnnotationContent,
    createSnapshot,
    deleteSnapshot,
    restoreSnapshot,
    compareVersions,
    clearCompare,
    startCompare,
    persistAnnotations,
  }
})
