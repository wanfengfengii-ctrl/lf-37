import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VersionSnapshot, VersionDiffItem, Scene, Annotation, Resource } from '@/types'
import { genId } from '@/utils/id'
import { loadVersions, saveVersions } from '@/utils/storage'
import { compareVersionSnapshots, cloneSnapshotData, findLatestMilestone } from '@/utils/version-diff'
import { buildResourceNameMap } from '@/utils/resource-map'
import { generateVersionLabel } from '@/utils/date'

export const useVersionStore = defineStore('version', () => {
  const versionSnapshots = ref<VersionSnapshot[]>(loadVersions<VersionSnapshot>())
  const showVersionPanel = ref(false)
  const compareVersionIds = ref<[string, string] | null>(null)

  function persist() {
    saveVersions(versionSnapshots.value)
  }

  const sortedSnapshots = computed(() =>
    [...versionSnapshots.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )

  const milestoneCount = computed(() =>
    versionSnapshots.value.filter((s) => s.isMilestone).length
  )

  function createSnapshot(options: {
    scenes: Scene[]
    annotations: Annotation[]
    resources: Resource[]
    label?: string
    description?: string
    isMilestone?: boolean
  }): VersionSnapshot {
    const now = new Date()
    const { scenes, annotations, resources, label, description, isMilestone } = options

    const resourceNames = buildResourceNameMap(resources)
    const frozenAnnotationIds = annotations
      .filter((a) => a.status !== 'resolved')
      .map((a) => a.id)

    const snapshot: VersionSnapshot = {
      id: genId(),
      label: label || generateVersionLabel(versionSnapshots.value.length, now),
      description: description || '',
      scenes: cloneSnapshotData(scenes),
      annotations: cloneSnapshotData(annotations),
      resourceNames,
      createdAt: now.toISOString(),
      createdBy: 'current_user',
      isLocked: false,
      isMilestone: isMilestone || false,
      frozenAnnotationIds,
    }

    versionSnapshots.value.push(snapshot)
    persist()
    return snapshot
  }

  function getSnapshotById(id: string): VersionSnapshot | undefined {
    return versionSnapshots.value.find((v) => v.id === id)
  }

  function updateSnapshot(id: string, patch: Partial<VersionSnapshot>) {
    const snapshot = versionSnapshots.value.find((v) => v.id === id)
    if (!snapshot) return
    if (snapshot.isLocked && (patch.isLocked !== undefined || patch.isMilestone !== undefined)) {
      return
    }
    Object.assign(snapshot, patch)
    persist()
  }

  function toggleSnapshotLock(id: string) {
    const snapshot = versionSnapshots.value.find((v) => v.id === id)
    if (!snapshot) return
    snapshot.isLocked = !snapshot.isLocked
    persist()
  }

  function toggleSnapshotMilestone(id: string) {
    const snapshot = versionSnapshots.value.find((v) => v.id === id)
    if (!snapshot) return
    snapshot.isMilestone = !snapshot.isMilestone
    persist()
  }

  function deleteSnapshot(id: string) {
    const snapshot = versionSnapshots.value.find((v) => v.id === id)
    if (snapshot?.isLocked) return
    const idx = versionSnapshots.value.findIndex((v) => v.id === id)
    if (idx > -1) {
      versionSnapshots.value.splice(idx, 1)
      persist()
    }
  }

  function restoreSnapshot(id: string): { ok: boolean; scenes?: Scene[]; annotations?: Annotation[]; frozenIds?: string[]; message?: string } {
    const snapshot = versionSnapshots.value.find((v) => v.id === id)
    if (!snapshot) return { ok: false, message: '快照不存在' }

    return {
      ok: true,
      scenes: cloneSnapshotData(snapshot.scenes),
      annotations: cloneSnapshotData(snapshot.annotations),
      frozenIds: snapshot.frozenAnnotationIds,
    }
  }

  function compareVersions(versionIdA: string, versionIdB: string): VersionDiffItem[] {
    const vA = versionSnapshots.value.find((v) => v.id === versionIdA)
    const vB = versionSnapshots.value.find((v) => v.id === versionIdB)
    if (!vA || !vB) return []
    return compareVersionSnapshots(vA, vB)
  }

  function getLatestMilestone(): VersionSnapshot | null {
    return findLatestMilestone(versionSnapshots.value)
  }

  function clearCompare() {
    compareVersionIds.value = null
  }

  function startCompare(idA: string, idB: string) {
    compareVersionIds.value = [idA, idB]
  }

  return {
    versionSnapshots,
    sortedSnapshots,
    milestoneCount,
    showVersionPanel,
    compareVersionIds,
    createSnapshot,
    getSnapshotById,
    updateSnapshot,
    toggleSnapshotLock,
    toggleSnapshotMilestone,
    deleteSnapshot,
    restoreSnapshot,
    compareVersions,
    getLatestMilestone,
    clearCompare,
    startCompare,
  }
})
