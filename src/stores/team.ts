import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TeamMember } from '@/types'
import { genId } from '@/utils/id'
import { loadTeamMembers, saveTeamMembers } from '@/utils/storage'

const DEFAULT_MEMBERS: TeamMember[] = [
  { id: 'm1', name: '张导演', role: '导演', avatar: '🎬', color: '#E6A23C' },
  { id: 'm2', name: '李演员', role: '主演', avatar: '🎭', color: '#409EFF' },
  { id: 'm3', name: '王灯光', role: '灯光师', avatar: '💡', color: '#F56C6C' },
  { id: 'm4', name: '赵音效', role: '音效师', avatar: '🎵', color: '#67C23A' },
  { id: 'm5', name: '陈道具', role: '道具师', avatar: '🎪', color: '#909399' },
]

export const useTeamStore = defineStore('team', () => {
  const teamMembers = ref<TeamMember[]>(loadTeamMembers<TeamMember>(DEFAULT_MEMBERS))

  function persist() {
    saveTeamMembers(teamMembers.value)
  }

  function getMemberById(id: string): TeamMember | undefined {
    return teamMembers.value.find((m) => m.id === id)
  }

  function addMember(member: Omit<TeamMember, 'id'>) {
    const newMember: TeamMember = {
      ...member,
      id: genId(),
    }
    teamMembers.value.push(newMember)
    persist()
    return newMember
  }

  function updateMember(id: string, patch: Partial<TeamMember>) {
    const member = teamMembers.value.find((m) => m.id === id)
    if (!member) return
    Object.assign(member, patch)
    persist()
  }

  function removeMember(id: string) {
    const idx = teamMembers.value.findIndex((m) => m.id === id)
    if (idx > -1) {
      teamMembers.value.splice(idx, 1)
      persist()
    }
  }

  return {
    teamMembers,
    getMemberById,
    addMember,
    updateMember,
    removeMember,
  }
})
