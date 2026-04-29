import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

export function createLabel(projectId, payload) {
  return httpClient.post(`/api/projects/${encodeId(projectId)}/labels`, payload)
}

export function listLabels(projectId) {
  return httpClient.get(`/api/projects/${encodeId(projectId)}/labels`)
}

export function updateLabel(labelId, patch) {
  return httpClient.patch(`/api/labels/${encodeId(labelId)}`, patch)
}

export function deleteLabel(labelId) {
  return httpClient.delete(`/api/labels/${encodeId(labelId)}`)
}

export function attachLabelToIssue(issueKey, labelId) {
  return httpClient.post(`/api/issues/${encodeId(issueKey)}/labels`, { labelId })
}

export function detachLabelFromIssue(issueKey, labelId) {
  return httpClient.delete(`/api/issues/${encodeId(issueKey)}/labels/${encodeId(labelId)}`)
}
