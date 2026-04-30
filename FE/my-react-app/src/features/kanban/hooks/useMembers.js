import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as projectApi from '../../projects/api/projectApi'

export function useMembers() {
  const { t } = useTranslation()
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [usersById, setUsersById] = useState({})

  const refetchMembers = useCallback(
    async (projectId) => {
      if (!projectId) return
      setMembersLoading(true)
      setMembersError('')
      try {
        const data = await projectApi.getProjectMembers(projectId)
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        setMembers(items)
        // Build usersById map
        const map = {}
        for (const m of items) {
          if (m?.id) map[m.id] = m
        }
        setUsersById(map)
      } catch (err) {
        setMembersError(err?.message || t('common.loadError'))
      } finally {
        setMembersLoading(false)
      }
    },
    [t],
  )

  return {
    members,
    membersLoading,
    membersError,
    usersById,
    refetchMembers,
    setMembers,
    setUsersById,
  }
}
