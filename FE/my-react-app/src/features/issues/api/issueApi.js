import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

export function createIssue(projectId, payload) {
  return httpClient.post(`/api/projects/${encodeId(projectId)}/issues`, payload)
}

export function listIssues(projectId, filter = {}) {
  const params = new URLSearchParams()
  const entries = Object.entries(filter ?? {})
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return httpClient.get(`/api/projects/${encodeId(projectId)}/issues${qs ? `?${qs}` : ''}`)
}

export function getIssue(issueKey) {
  return httpClient.get(`/api/issues/${encodeId(issueKey)}`)
}

export function updateIssue(issueKey, patch) {
  return httpClient.patch(`/api/issues/${encodeId(issueKey)}`, patch)
}

export function deleteIssue(issueKey) {
  return httpClient.delete(`/api/issues/${encodeId(issueKey)}`)
}

export function changeIssueStatus(issueKey, status) {
  return httpClient.put(`/api/issues/${encodeId(issueKey)}/status`, { status })
}

export function assignIssue(issueKey, assigneeId) {
  return httpClient.put(`/api/issues/${encodeId(issueKey)}/assign`, { assigneeId })
}

export function listSubtasks(issueKey) {
  return httpClient.get(`/api/issues/${encodeId(issueKey)}/subtasks`)
}
