import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Annotation,
  AnnotationType,
  AnnotationStatus,
  AnnotationPriority,
  RiskLevel,
  AnnotationFilter,
  AnnotationStats,
  PlaybackFilter,
  VersionSnapshot,
  VersionDiffItem,
  TeamMember,
  Scene,
  Resource,
} from '@/types'
import { useSceneStore } from './scene'
import { useVersionStore } from './version'
import { useTeamStore } from './team'
import { useResourceStore } from './resource'
import { genId } from '@/utils/id'
import { loadAnnotations, saveAnnotations } from '@/utils/storage'
import { isOverdue } from '@/utils/date'

export const useAnnotationStore = defineStore('annotation', () => {
  const sceneStore = useSceneStore()
  const versionStore = useVersionStore()
  const teamStore = useTeamStore()
  const resourceStore = useResourceStore()

  const annotations = ref<Annotation[]>(loadAnnotations<Annotation>())
  const showAnnotationPanel = ref(true)

  const currentFilter = ref<AnnotationFilter>({
    type: 'all',
    status: 'all',
    priority: 'all',
    assigneeId: 'all',
    riskLevel: 'all',
    keyword: '',
  })

  const playbackFilter = ref<PlaybackFilter>({
    assigneeId: 'all',
    riskLevel: 'all',
    showResolved: false,
  })

  function persist() {
    saveAnnotations(annotations.value)
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

  const overdueCount = computed(() =>
    annotations.value.filter((a) => a.status !== 'resolved' && isOverdue(a.deadline)).length
  )

  const filteredAnnotations = computed(() => {
    let list = [...sceneAnnotations.value]
    const filter = currentFilter.value

    if (filter.type && filter.type !== 'all') {
      list = list.filter((a) => a.type === filter.type)
    }
    if (filter.status && filter.status !== 'all') {
      list = list.filter((a) => a.status === filter.status)
    }
    if (filter.priority && filter.priority !== 'all') {
      list = list.filter((a) => a.priority === filter.priority)
    }
    if (filter.assigneeId && filter.assigneeId !== 'all') {
      list = list.filter((a) => a.assigneeId === filter.assigneeId)
    }
    if (filter.riskLevel && filter.riskLevel !== 'all') {
      list = list.filter((a) => a.riskLevel === filter.riskLevel)
    }
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase()
      list = list.filter((a) => a.content.toLowerCase().includes(keyword))
    }

    return sortAnnotations(list)
  })

  function sortAnnotations(list: Annotation[]): Annotation[] {
    const priorityOrder: Record<AnnotationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return [...list].sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      if (a.type === 'risk' && b.type !== 'risk') return -1
      if (a.type !== 'risk' && b.type === 'risk') return 1
      if (a.status === 'resolved' && b.status !== 'resolved') return 1
      if (a.status !== 'resolved' && b.status === 'resolved') return -1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  const annotationStats = computed<AnnotationStats>(() => {
    const list = sceneAnnotations.value
    const stats: AnnotationStats = {
      total: list.length,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: { director: 0, actor: 0, risk: 0 },
      byAssignee: {},
      overdue: 0,
      byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
    }

    for (const a of list) {
      if (a.status === 'in_progress') {
        stats.inProgress++
      } else {
        stats[a.status]++
      }
      stats.byPriority[a.priority]++
      stats.byType[a.type]++
      if (a.assigneeId) {
        stats.byAssignee[a.assigneeId] = (stats.byAssignee[a.assigneeId] || 0) + 1
      }
      if (a.status !== 'resolved' && isOverdue(a.deadline)) {
        stats.overdue++
      }
      if (a.riskLevel) {
        stats.byRiskLevel[a.riskLevel]++
      }
    }

    return stats
  })

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

  function getFilteredAnnotationsForTime(time: number): Annotation[] {
    const anns = getAnnotationsForTime(time)
    const filter = playbackFilter.value
    return anns.filter((a) => {
      if (!filter.showResolved && a.status === 'resolved') return false
      if (filter.assigneeId && filter.assigneeId !== 'all' && a.assigneeId !== filter.assigneeId) return false
      if (filter.riskLevel && filter.riskLevel !== 'all' && a.riskLevel !== filter.riskLevel) return false
      return true
    })
  }

  function getRiskAnnotationsForTime(time: number): Annotation[] {
    return getFilteredAnnotationsForTime(time).filter(
      (a) => a.type === 'risk' && a.status !== 'resolved'
    )
  }

  function addAnnotation(partial: {
    sceneId: string
    cueId?: string
    type: AnnotationType
    content: string
    priority?: AnnotationPriority
    riskLevel?: RiskLevel
    assigneeId?: string
    deadline?: string
  }) {
    const now = new Date().toISOString()
    const annotation: Annotation = {
      id: genId(),
      sceneId: partial.sceneId,
      cueId: partial.cueId,
      type: partial.type,
      content: partial.content,
      status: 'pending',
      priority: partial.priority || 'medium',
      riskLevel: partial.riskLevel,
      assigneeId: partial.assigneeId,
      deadline: partial.deadline,
      createdAt: now,
      updatedAt: now,
      createdBy: 'current_user',
    }
    annotations.value.push(annotation)
    persist()
    return annotation
  }

  function updateAnnotation(id: string, patch: Partial<Annotation>) {
    const ann = annotations.value.find((a) => a.id === id)
    if (!ann) return
    Object.assign(ann, patch, { updatedAt: new Date().toISOString() })
    persist()
  }

  function updateAnnotationStatus(id: string, status: AnnotationStatus) {
    const ann = annotations.value.find((a) => a.id === id)
    if (!ann) return
    ann.status = status
    ann.updatedAt = new Date().toISOString()
    persist()
  }

  function removeAnnotation(id: string) {
    const idx = annotations.value.findIndex((a) => a.id === id)
    if (idx > -1) {
      annotations.value.splice(idx, 1)
      persist()
    }
  }

  function updateAnnotationContent(id: string, content: string) {
    const ann = annotations.value.find((a) => a.id === id)
    if (!ann) return
    ann.content = content
    ann.updatedAt = new Date().toISOString()
    persist()
  }

  function replaceAllAnnotations(newAnnotations: Annotation[]) {
    annotations.value = [...newAnnotations]
    persist()
  }

  // ---------- 向后兼容：团队成员代理（已迁移至 teamStore） ----------
  const teamMembers = computed<TeamMember[]>(() => teamStore.teamMembers)

  function getMemberById(id: string): TeamMember | undefined {
    return teamStore.getMemberById(id)
  }

  // ---------- 向后兼容：版本快照代理（已迁移至 versionStore） ----------
  const versionSnapshots = computed<VersionSnapshot[]>(() => versionStore.versionSnapshots)

  const showVersionPanel = computed({
    get: () => versionStore.showVersionPanel,
    set: (v: boolean) => { versionStore.showVersionPanel = v },
  })

  function createSnapshot(options?: {
    label?: string
    description?: string
    isMilestone?: boolean
  }): VersionSnapshot {
    return versionStore.createSnapshot({
      scenes: sceneStore.scenes as Scene[],
      annotations: annotations.value,
      resources: resourceStore.resources as Resource[],
      ...options,
    })
  }

  function compareVersions(versionIdA: string, versionIdB: string): VersionDiffItem[] {
    return versionStore.compareVersions(versionIdA, versionIdB)
  }

  function getSnapshotById(id: string): VersionSnapshot | undefined {
    return versionStore.getSnapshotById(id)
  }

  function updateSnapshot(id: string, patch: Partial<VersionSnapshot>) {
    return versionStore.updateSnapshot(id, patch)
  }

  function toggleSnapshotLock(id: string) {
    return versionStore.toggleSnapshotLock(id)
  }

  function toggleSnapshotMilestone(id: string) {
    return versionStore.toggleSnapshotMilestone(id)
  }

  function deleteSnapshot(id: string) {
    return versionStore.deleteSnapshot(id)
  }

  function restoreSnapshot(id: string): { ok: boolean; scenes?: Scene[]; annotations?: Annotation[]; frozenIds?: string[]; message?: string } {
    const result = versionStore.restoreSnapshot(id)
    if (result.ok && result.scenes && result.annotations) {
      sceneStore.replaceAllScenes(result.scenes)
      annotations.value = [...result.annotations]
      persist()
    }
    return result
  }

  return {
    annotations,
    showAnnotationPanel,
    currentFilter,
    playbackFilter,
    sceneAnnotations,
    cueAnnotations,
    pendingRiskCount,
    unresolvedCount,
    overdueCount,
    filteredAnnotations,
    annotationStats,
    getAnnotationsForTime,
    getFilteredAnnotationsForTime,
    getRiskAnnotationsForTime,
    addAnnotation,
    updateAnnotation,
    updateAnnotationStatus,
    removeAnnotation,
    updateAnnotationContent,
    replaceAllAnnotations,
    persist,
    // ---------- 向后兼容：团队成员（已迁移至 teamStore） ----------
    teamMembers,
    getMemberById,
    // ---------- 向后兼容：版本快照（已迁移至 versionStore） ----------
    versionSnapshots,
    showVersionPanel,
    createSnapshot,
    compareVersions,
    getSnapshotById,
    updateSnapshot,
    toggleSnapshotLock,
    toggleSnapshotMilestone,
    deleteSnapshot,
    restoreSnapshot,
  }
})
