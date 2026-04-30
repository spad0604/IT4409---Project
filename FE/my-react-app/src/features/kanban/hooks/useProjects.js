import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as projectApi from '../../projects/api/projectApi'

export function useProjects() {
  const { t } = useTranslation()
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')

  const refetchProjects = useCallback(async () => {
    setProjectsLoading(true)
    setProjectsError('')
    try {
      const data = await projectApi.listProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      setProjectsError(err?.message || t('common.loadError'))
    } finally {
      setProjectsLoading(false)
    }
  }, [t])

  return {
    projects,
    projectsLoading,
    projectsError,
    refetchProjects,
    setProjects,
  }
}
