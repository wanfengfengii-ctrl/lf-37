import type { Resource, ResourceType, CuePoint, TrackType } from '@/types'
import { TRACK_LABELS, POSITION_LABELS } from '@/types'

export type ResourceNameMap = Record<string, string>

export function buildResourceNameMap(resources: Resource[]): ResourceNameMap {
  const map: ResourceNameMap = {}
  for (const r of resources) {
    map[r.id] = r.name
  }
  return map
}

export function getResourceById(resources: Resource[], id: string): Resource | undefined {
  return resources.find((r) => r.id === id)
}

export function filterResourcesByType(
  resources: Resource[],
  type: ResourceType | 'all'
): Resource[] {
  if (type === 'all') return resources
  return resources.filter((r) => r.type === type)
}

export function searchResources(resources: Resource[], keyword: string): Resource[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return resources
  return resources.filter((r) => r.name.toLowerCase().includes(kw))
}

const DEFAULT_SOUND_URLS: Record<string, string> = {
  '开场锣': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  '急促鼓点': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  '幕间钹': 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
  '战鼓': 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
  '收尾锣': 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3',
}

export function resolveSoundAudioUrl(resources: Resource[], resourceId: string): string {
  const res = resourceId ? getResourceById(resources, resourceId) : null
  if (res?.audioUrl) return res.audioUrl
  const fallbackName = res?.name
  if (fallbackName && DEFAULT_SOUND_URLS[fallbackName]) {
    return DEFAULT_SOUND_URLS[fallbackName]
  }
  return DEFAULT_SOUND_URLS['开场锣']
}

export function describeCue(
  cue: CuePoint,
  resourceNames?: ResourceNameMap
): string {
  const resName = resourceNames?.[cue.resourceId]
  switch (cue.trackType) {
    case 'character':
      return resName
        ? `${resName}(${POSITION_LABELS[cue.position]})`
        : POSITION_LABELS[cue.position]
    case 'lighting':
      return `亮度${cue.brightness}%`
    case 'sound':
      return resName ? `${resName}(音量${cue.volume}%)` : `音量${cue.volume}%`
    case 'narration':
      return cue.narration?.slice(0, 10) || '旁白'
    case 'backdrop':
      return resName || '幕景切换'
    default:
      return ''
  }
}

export function groupCuesByTrack(
  cues: CuePoint[],
  trackOrder: TrackType[]
): Record<TrackType, CuePoint[]> {
  const map: Record<TrackType, CuePoint[]> = {
    character: [],
    lighting: [],
    sound: [],
    narration: [],
    backdrop: [],
  }
  for (const cue of cues) {
    map[cue.trackType].push(cue)
  }
  for (const t of trackOrder) {
    map[t].sort((a, b) => a.time - b.time)
  }
  return map
}

export interface ResourceLabelData {
  trackLabel: string
  cueDescription: string
}

export function getCueTrackLabels(
  cue: CuePoint,
  resourceNames?: ResourceNameMap
): ResourceLabelData {
  return {
    trackLabel: TRACK_LABELS[cue.trackType],
    cueDescription: describeCue(cue, resourceNames),
  }
}

export function remapSceneResourceIds(
  scenes: Array<{ cues: Array<{ resourceId?: string; trackType: TrackType; _resourceName?: string }> }>,
  resources: Resource[]
): void {
  const nameTypeMap = new Map<string, string>()
  for (const r of resources) {
    nameTypeMap.set(`${r.type}:${r.name}`, r.id)
  }
  const trackToType: Record<TrackType, string> = {
    character: 'character',
    sound: 'sound',
    backdrop: 'backdrop',
    lighting: 'lighting',
    narration: 'narration',
  }
  for (const scene of scenes) {
    for (const cue of scene.cues) {
      if (cue.resourceId && !resources.some(r => r.id === cue.resourceId)) {
        const resName = cue._resourceName || ''
        const resType = trackToType[cue.trackType] || ''
        const mappedId = nameTypeMap.get(`${resType}:${resName}`)
        if (mappedId) {
          cue.resourceId = mappedId
        }
      }
    }
  }
}
