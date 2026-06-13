export interface StorageMeta {
  version: number
  savedAt?: string
  exportedAt?: string
}

export interface SceneStorageData extends StorageMeta {
  scenes: unknown[]
}

export interface AnnotationStorageData extends StorageMeta {
  annotations: unknown[]
}

export interface VersionStorageData extends StorageMeta {
  versions: unknown[]
}

export interface TeamStorageData extends StorageMeta {
  members: unknown[]
}

export interface ImportExportData extends StorageMeta {
  scenes: unknown[]
  annotations?: unknown[]
  versions?: unknown[]
  teamMembers?: unknown[]
}
