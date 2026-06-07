import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as activityApi from '../../activity/api/activityApi'

export function useActivity() {
  const { t } = useTranslation()
  const [activityLog, setActivityLog] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')

  const refetchProjectActivity = useCallback(
    async (projectId) => {
      if (!projectId) return
      setActivityLoading(true)
      setActivityError('')
      try {
        const data = await activityApi.getProjectActivity(projectId)
        if (Array.isArray(data?.items)) {
          setActivityLog(data.items)
        } else {
          setActivityLog(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        setActivityError(err?.message || t('common.loadError'))
      } finally {
        setActivityLoading(false)
      }
    },
    [t],
  )

  return {
    activityLog,
    activityLoading,
    activityError,
    refetchProjectActivity,
    setActivityLog,
  }
}
