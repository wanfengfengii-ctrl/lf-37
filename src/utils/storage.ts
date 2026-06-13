import type {
  SceneStorageData,
  AnnotationStorageData,
  VersionStorageData,
  TeamStorageData,
  ImportExportData,
  StorageMeta,
} from '@/types'

const SCENE_KEY = 'shadow-puppet-stage'
const ANNOTATION_KEY = 'shadow-puppet-annotations'
const VERSION_KEY = 'shadow-puppet-versions'
const MEMBERS_KEY = 'shadow-puppet-members'
const CURRENT_STORAGE_VERSION = 1

export function readFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn(`[Storage] Failed to read key "${key}":`, e)
  }
  return null
}

export function writeToStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (e) {
    console.warn(`[Storage] Failed to write key "${key}":`, e)
    return false
  }
}

export function removeFromStorage(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch (e) {
    console.warn(`[Storage] Failed to remove key "${key}":`, e)
    return false
  }
}

export function createStorageMeta(): StorageMeta {
  return {
    version: CURRENT_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
  }
}

export function createExportMeta(): StorageMeta {
  return {
    version: CURRENT_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
  }
}

export function loadScenes<T>(): { data: T[]; savedAt?: string } | null {
  const result = readFromStorage<SceneStorageData>(SCENE_KEY)
  if (result && result.scenes && Array.isArray(result.scenes) && result.scenes.length > 0) {
    return { data: result.scenes as T[], savedAt: result.savedAt }
  }
  return null
}

export function saveScenes<T>(scenes: T[]): boolean {
  const payload: SceneStorageData = {
    ...createStorageMeta(),
    scenes: scenes as unknown[],
  }
  return writeToStorage(SCENE_KEY, payload)
}

export function clearScenesStorage(): boolean {
  return removeFromStorage(SCENE_KEY)
}

export function loadAnnotations<T>(): T[] {
  const result = readFromStorage<AnnotationStorageData>(ANNOTATION_KEY)
  if (result && result.annotations && Array.isArray(result.annotations)) {
    return result.annotations as T[]
  }
  return []
}

export function saveAnnotations<T>(annotations: T[]): boolean {
  const payload: AnnotationStorageData = {
    ...createStorageMeta(),
    annotations: annotations as unknown[],
  }
  return writeToStorage(ANNOTATION_KEY, payload)
}

export function loadVersions<T>(): T[] {
  const result = readFromStorage<VersionStorageData>(VERSION_KEY)
  if (result && result.versions && Array.isArray(result.versions)) {
    return result.versions as T[]
  }
  return []
}

export function saveVersions<T>(versions: T[]): boolean {
  const payload: VersionStorageData = {
    ...createStorageMeta(),
    versions: versions as unknown[],
  }
  return writeToStorage(VERSION_KEY, payload)
}

export function loadTeamMembers<T>(fallback: T[]): T[] {
  const result = readFromStorage<TeamStorageData>(MEMBERS_KEY)
  if (result && result.members && Array.isArray(result.members)) {
    return result.members as T[]
  }
  return fallback
}

export function saveTeamMembers<T>(members: T[]): boolean {
  const payload: TeamStorageData = {
    ...createStorageMeta(),
    members: members as unknown[],
  }
  return writeToStorage(MEMBERS_KEY, payload)
}

export interface ImportPayload {
  scenes: unknown[]
  annotations?: unknown[]
  versions?: unknown[]
  teamMembers?: unknown[]
}

export function serializeExportPayload(payload: ImportPayload): string {
  const exportData: ImportExportData = {
    ...createExportMeta(),
    ...payload,
  }
  return JSON.stringify(exportData, null, 2)
}

export function deserializeImportPayload(raw: string): ImportPayload & { meta: StorageMeta } | null {
  try {
    const parsed: ImportExportData = JSON.parse(raw)
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      return null
    }
    return {
      scenes: parsed.scenes,
      annotations: parsed.annotations,
      versions: parsed.versions,
      teamMembers: parsed.teamMembers,
      meta: {
        version: parsed.version,
        savedAt: parsed.savedAt,
        exportedAt: parsed.exportedAt,
      },
    }
  } catch {
    return null
  }
}

export function downloadExportFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        resolve(JSON.parse(text))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
