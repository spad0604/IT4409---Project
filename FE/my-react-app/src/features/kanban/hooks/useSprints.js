import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as sprintApi from '../../sprints/api/sprintApi'

export function useSprints() {
  const { t } = useTranslation()
  const [sprints, setSprints] = useState([])
  const [sprintsLoading, setSprintsLoading] = useState(false)
  const [sprintsError, setSprintsError] = useState('')
  const [activeSprint, setActiveSprint] = useState(null)
  const [backlogIssues, setBacklogIssues] = useState([])
  const [backlogLoading, setBacklogLoading] = useState(false)

  const refetchSprints = useCallback(async (projectId) => {
    if (!projectId) return
    setSprintsLoading(true)
    setSprintsError('')
    try {
      const data = await sprintApi.listSprints(projectId)
      setSprints(Array.isArray(data) ? data : [])
    } catch (err) {
      setSprintsError(err?.message || t('common.loadError'))
    } finally {
      setSprintsLoading(false)
    }
  }, [t])

  const refetchBacklog = useCallback(async (projectId) => {
    if (!projectId) return
    setBacklogLoading(true)
    try {
      const data = await sprintApi.getBacklog(projectId)
      setBacklogIssues(Array.isArray(data?.items) ? data.items : [])
    } catch {
      setBacklogIssues([])
    } finally {
      setBacklogLoading(false)
    }
  }, [])

  return {
    sprints,
    sprintsLoading,
    sprintsError,
    activeSprint,
    backlogIssues,
    backlogLoading,
    refetchSprints,
    refetchBacklog,
    setSprints,
    setActiveSprint,
    setBacklogIssues,
  }
}
