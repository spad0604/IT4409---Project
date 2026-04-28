import { httpClient } from '../../../shared/api/httpClient'

function encodeId(value) {
  return encodeURIComponent(String(value ?? ''))
}

export function createBoard(projectId, { name }) {
  return httpClient.post(`/api/projects/${encodeId(projectId)}/boards`, { name })
}

export function listBoards(projectId) {
  return httpClient.get(`/api/projects/${encodeId(projectId)}/boards`)
}

export function getBoard(boardId) {
  return httpClient.get(`/api/boards/${encodeId(boardId)}`)
}

export function updateBoard(boardId, patch) {
  return httpClient.patch(`/api/boards/${encodeId(boardId)}`, patch)
}

export function deleteBoard(boardId) {
  return httpClient.delete(`/api/boards/${encodeId(boardId)}`)
}

export function addColumn(boardId, payload) {
  return httpClient.post(`/api/boards/${encodeId(boardId)}/columns`, payload)
}

export function updateColumn(boardId, columnId, patch) {
  return httpClient.patch(`/api/boards/${encodeId(boardId)}/columns/${encodeId(columnId)}`, patch)
}

export function deleteColumn(boardId, columnId) {
  return httpClient.delete(`/api/boards/${encodeId(boardId)}/columns/${encodeId(columnId)}`)
}

export function reorderColumns(boardId, columnIds) {
  return httpClient.put(`/api/boards/${encodeId(boardId)}/columns/reorder`, { columnIds })
}
