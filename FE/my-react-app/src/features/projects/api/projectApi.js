import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

function projectPath(projectId) {
  return `/api/projects/${encodeId(projectId)}`
}

export function createProject(payload) {
  return httpClient.post('/api/projects', payload)
}

export function listProjects() {
  return httpClient.get('/api/projects')
}

export function getProject(projectId) {
  return httpClient.get(projectPath(projectId))
}

export function updateProject(projectId, patch) {
  return httpClient.patch(projectPath(projectId), patch)
}

export function deleteProject(projectId) {
  return httpClient.delete(projectPath(projectId))
}

export function getProjectMembers(projectId) {
  return httpClient.get(`${projectPath(projectId)}/members`)
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
