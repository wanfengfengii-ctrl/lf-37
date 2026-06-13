import type { ResourceType } from './common'

export interface Resource {
  id: string
  type: ResourceType
  name: string
  icon: string
  audioUrl: string
  imageUrl: string
}
