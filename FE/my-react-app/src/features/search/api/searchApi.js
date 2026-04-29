import { httpClient } from '../../../shared/api/httpClient'

/**
 * GET /api/search
 * Params:
 * - q (required)
 * - type: 'issues' | 'projects' (optional)
 * - project_id (optional)
 */
export function search({ q, type, projectId } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', String(q))
  if (type) params.set('type', String(type))
  if (projectId) params.set('project_id', String(projectId))
  const qs = params.toString()
  return httpClient.get(`/api/search${qs ? `?${qs}` : ''}`)
}
