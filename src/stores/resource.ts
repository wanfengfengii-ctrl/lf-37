import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Resource, ResourceType } from '@/types'

const genId = () => Math.random().toString(36).slice(2, 10)

const mockCharacters: Resource[] = [
  { id: genId(), type: 'character', name: '张飞', icon: '🎭', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'character', name: '关羽', icon: '🗡️', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'character', name: '刘备', icon: '👑', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'character', name: '诸葛亮', icon: '📜', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'character', name: '曹操', icon: '⚔️', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'character', name: '赵云', icon: '🛡️', audioUrl: '', imageUrl: '' },
]

const mockBackdrops: Resource[] = [
  { id: genId(), type: 'backdrop', name: '古城门', icon: '🏛️', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'backdrop', name: '山水田园', icon: '🏞️', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'backdrop', name: '宫殿内景', icon: '🏰', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'backdrop', name: '战场', icon: '⚔️', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'backdrop', name: '庭院', icon: '🌳', audioUrl: '', imageUrl: '' },
]

const mockSounds: Resource[] = [
  { id: genId(), type: 'sound', name: '开场锣', icon: '🥁', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'sound', name: '急促鼓点', icon: '🎵', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'sound', name: '幕间钹', icon: '🎶', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'sound', name: '战鼓', icon: '🥁', audioUrl: '', imageUrl: '' },
  { id: genId(), type: 'sound', name: '收尾锣', icon: '🔔', audioUrl: '', imageUrl: '' },
]

export const useResourceStore = defineStore('resource', () => {
  const resources = ref<Resource[]>([
    ...mockCharacters,
    ...mockBackdrops,
    ...mockSounds,
  ])

  const searchKeyword = ref('')
  const filterType = ref<ResourceType | 'all'>('all')

  const characters = computed(() =>
    resources.value.filter((r) => r.type === 'character')
  )
  const backdrops = computed(() =>
    resources.value.filter((r) => r.type === 'backdrop')
  )
  const sounds = computed(() =>
    resources.value.filter((r) => r.type === 'sound')
  )

  const filteredResources = computed(() => {
    let list = resources.value
    if (filterType.value !== 'all') {
      list = list.filter((r) => r.type === filterType.value)
    }
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase()
      list = list.filter((r) => r.name.toLowerCase().includes(kw))
    }
    return list
  })

  function getResourceById(id: string) {
    return resources.value.find((r) => r.id === id)
  }

  function addResource(resource: Omit<Resource, 'id'>) {
    resources.value.push({ ...resource, id: genId() })
  }

  function removeResource(id: string) {
    const idx = resources.value.findIndex((r) => r.id === id)
    if (idx > -1) resources.value.splice(idx, 1)
  }

  return {
    resources,
    searchKeyword,
    filterType,
    characters,
    backdrops,
    sounds,
    filteredResources,
    getResourceById,
    addResource,
    removeResource,
  }
})
