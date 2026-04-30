import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as issueApi from '../../issues/api/issueApi'

export function useIssues() {
  const { t } = useTranslation()
  const [issuesData, setIssuesData] = useState({ items: [], total: 0, page: 0, perPage: 20 })
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [issuesError, setIssuesError] = useState('')
  const [assignedIssues, setAssignedIssues] = useState([])

  const refetchIssues = useCallback(
    async (projectId, { search } = {}) => {
      if (!projectId) return
      setIssuesLoading(true)
      setIssuesError('')
      try {
        const data = await issueApi.listIssues(projectId, { search })
        setIssuesData({
          items: Array.isArray(data?.items) ? data.items : [],
          total: data?.total ?? 0,
          page: data?.page ?? 0,
          perPage: data?.perPage ?? 20,
        })
      } catch (err) {
        setIssuesError(err?.message || t('common.loadError'))
      } finally {
        setIssuesLoading(false)
      }
    },
    [t],
  )

  const refetchAssigned = useCallback(async (projectId) => {
    if (!projectId) return
    try {
      const data = await issueApi.listIssues(projectId, { assignee: 'me' })
      setAssignedIssues(Array.isArray(data?.items) ? data.items : [])
    } catch {
      setAssignedIssues([])
    }
  }, [])

  return {
    issuesData,
    issuesLoading,
    issuesError,
    assignedIssues,
    refetchIssues,
    refetchAssigned,
    setIssuesData,
    setAssignedIssues,
  }
}
