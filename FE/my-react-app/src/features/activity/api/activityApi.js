import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

/**
 * GET /api/issues/{issueKey}/activity
 * Get activity log for a specific issue
 */
export function getIssueActivity(issueKey, { page, perPage } = {}) {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (perPage !== undefined) params.set('per_page', String(perPage))
  const qs = params.toString()
  return httpClient.get(`/api/issues/${encodeId(issueKey)}/activity${qs ? `?${qs}` : ''}`)
}

/**
 * GET /api/projects/{projectID}/activity
 * Get activity stream for a project
 */
export function getProjectActivity(projectId, { page, perPage } = {}) {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (perPage !== undefined) params.set('per_page', String(perPage))
  const qs = params.toString()
  return httpClient.get(`/api/projects/${encodeId(projectId)}/activity${qs ? `?${qs}` : ''}`)
}
