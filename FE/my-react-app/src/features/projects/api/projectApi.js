import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

function projectPath(projectId) {
  return `/api/projects/${encodeId(projectId)}`
}

function normalizeProjectList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.projects)) return payload.projects
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function normalizeProject(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload.project ?? payload
  }
  return payload
}

function normalizeProjectMembers(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.members)) return payload.members
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

export function createProject(payload) {
  return httpClient.post('/api/projects', payload).then(normalizeProject)
}

export function listProjects() {
  return httpClient.get('/api/projects').then(normalizeProjectList)
}

export function getProject(projectId) {
  return httpClient.get(projectPath(projectId)).then(normalizeProject)
}

export function updateProject(projectId, patch) {
  return httpClient.patch(projectPath(projectId), patch).then(normalizeProject)
}

export function deleteProject(projectId) {
  return httpClient.delete(projectPath(projectId))
}

export function getProjectMembers(projectId) {
  return httpClient.get(`${projectPath(projectId)}/members`).then(normalizeProjectMembers)
}

export function addProjectMember(projectId, { userId, role }) {
  return httpClient.post(`${projectPath(projectId)}/members`, { userId, role })
}

export function removeProjectMember(projectId, userId) {
  return httpClient.delete(`${projectPath(projectId)}/members/${encodeId(userId)}`)
}

export function changeProjectMemberRole(projectId, userId, role) {
  return httpClient.put(`${projectPath(projectId)}/members/${encodeId(userId)}`, { role })
}
