import type {
  Scene,
  Annotation,
  CuePoint,
  VersionSnapshot,
  VersionDiffItem,
} from '@/types'
import { POSITION_LABELS, TRACK_LABELS } from '@/types'
import { describeCue, type ResourceNameMap } from './resource-map'

export interface CompareOptions {
  includeAnnotations?: boolean
}

export function compareVersionSnapshots(
  vA: VersionSnapshot,
  vB: VersionSnapshot,
  options: CompareOptions = {}
): VersionDiffItem[] {
  const diffs: VersionDiffItem[] = []
  const { includeAnnotations = true } = options

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

    compareCues(
      sA!.cues,
      sB!.cues,
      sceneLabel,
      diffs,
      vA.resourceNames,
      vB.resourceNames
    )
  }

  if (includeAnnotations) {
    compareAnnotations(vA.annotations, vB.annotations, diffs)
  }

  return diffs
}

export function compareCues(
  cuesA: CuePoint[],
  cuesB: CuePoint[],
  sceneLabel: string,
  diffs: VersionDiffItem[],
  namesA: ResourceNameMap,
  namesB: ResourceNameMap
): void {
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

export function compareAnnotations(
  annsA: Annotation[],
  annsB: Annotation[],
  diffs: VersionDiffItem[]
): void {
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

export function cloneSnapshotData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

export function findLatestMilestone(snapshots: VersionSnapshot[]): VersionSnapshot | null {
  const milestones = snapshots.filter((s) => s.isMilestone)
  if (milestones.length === 0) return null
  return milestones.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b
  )
}
