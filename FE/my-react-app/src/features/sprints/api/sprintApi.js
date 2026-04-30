import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

/**
 * POST /api/projects/{projectID}/sprints
 * Create a new sprint
 */
export function createSprint(projectId, { name, description, startDate, endDate } = {}) {
  return httpClient.post(`/api/projects/${encodeId(projectId)}/sprints`, {
    name,
    description,
    startDate,
    endDate,
  })
}

/**
 * GET /api/projects/{projectID}/sprints
 * List all sprints for a project
 */
export function listSprints(projectId, { page, perPage } = {}) {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (perPage !== undefined) params.set('per_page', String(perPage))
  const qs = params.toString()
  return httpClient.get(`/api/projects/${encodeId(projectId)}/sprints${qs ? `?${qs}` : ''}`)
}

/**
 * GET /api/sprints/{sprintID}
 * Get sprint details
 */
export function getSprint(sprintId) {
  return httpClient.get(`/api/sprints/${encodeId(sprintId)}`)
}

/**
 * PATCH /api/sprints/{sprintID}
 * Update sprint info
 */
export function updateSprint(sprintId, patch) {
  return httpClient.patch(`/api/sprints/${encodeId(sprintId)}`, patch)
}

/**
 * POST /api/sprints/{sprintID}/start
 * Start a sprint
 */
export function startSprint(sprintId) {
  return httpClient.post(`/api/sprints/${encodeId(sprintId)}/start`)
}

/**
 * POST /api/sprints/{sprintID}/complete
 * Complete/close a sprint
 */
export function completeSprint(sprintId) {
  return httpClient.post(`/api/sprints/${encodeId(sprintId)}/complete`)
}

/**
 * GET /api/projects/{projectID}/backlog
 * Get backlog issues (not assigned to any sprint)
 */
export function getBacklog(projectId, { page, perPage, search } = {}) {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (perPage !== undefined) params.set('per_page', String(perPage))
  if (search) params.set('search', String(search))
  const qs = params.toString()
  return httpClient.get(`/api/projects/${encodeId(projectId)}/backlog${qs ? `?${qs}` : ''}`)
}
