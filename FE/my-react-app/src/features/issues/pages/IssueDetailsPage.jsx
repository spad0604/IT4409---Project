import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiClock, FiDownload, FiPlus, FiTrash2 } from 'react-icons/fi'
import * as issueApi from '../api/issueApi'
import * as commentApi from '../../comments/api/commentApi'
import * as attachmentApi from '../../attachments/api/attachmentApi'
import * as activityApi from '../../activity/api/activityApi'
import * as labelApi from '../../labels/api/labelApi'
import * as userApi from '../../users/api/userApi'
import './IssueDetailsPage.css'

const ISSUE_STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']
const ISSUE_TYPE_OPTIONS = ['task', 'bug', 'story', 'epic', 'subtask']
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'trivial']

function safeLower(value) {
  return String(value ?? '').trim().toLowerCase()
}

function formatDateTime(value, locale) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

function formatDateInput(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function parseFilenameFromContentDisposition(contentDisposition) {
  const cd = String(contentDisposition ?? '')
  const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
  const encoded = match?.[1]
  const raw = match?.[2]
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  return raw || ''
}

function relativeTime(value, locale) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = date.getTime() - Date.now()
  const absMinutes = Math.round(Math.abs(diffMs) / 60000)
  const rtf = new Intl.RelativeTimeFormat(locale.startsWith('vi') ? 'vi' : 'en', { numeric: 'auto' })

  if (absMinutes < 60) return rtf.format(Math.round(diffMs / 60000), 'minute')
  const absHours = Math.round(absMinutes / 60)
  if (absHours < 24) return rtf.format(Math.round(diffMs / 3600000), 'hour')
  return rtf.format(Math.round(diffMs / 86400000), 'day')
}

function fieldLabel(t, key, fallback) {
  return t(key, { defaultValue: fallback })
}

export default function IssueDetailsPage({
  issueKey,
  onBack,
  projectName,
  locale = 'vi-VN',
  members = [],
  usersById = {},
  embedded = false,
}) {
  const { t } = useTranslation()
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savingField, setSavingField] = useState('')

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [newCommentContent, setNewCommentContent] = useState('')
  const [newCommentLoading, setNewCommentLoading] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState('')
  const [editingCommentContent, setEditingCommentContent] = useState('')

  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

  const [subtasks, setSubtasks] = useState([])
  const [subtasksLoading, setSubtasksLoading] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskLoading, setNewSubtaskLoading] = useState(false)

  const [activities, setActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  const [projectLabels, setProjectLabels] = useState([])
  const [labelsLoading, setLabelsLoading] = useState(false)

  const [titleDraft, setTitleDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [descriptionEditing, setDescriptionEditing] = useState(false)

  const [userCache, setUserCache] = useState({})

  const headline = useMemo(() => issue?.key || issueKey, [issue?.key, issueKey])

  const mergedUsers = useMemo(() => ({ ...usersById, ...userCache }), [usersById, userCache])

  const commentItems = useMemo(() => {
    if (Array.isArray(comments?.items)) return comments.items
    if (Array.isArray(comments)) return comments
    return []
  }, [comments])

  const activityItems = useMemo(() => {
    if (Array.isArray(activities?.items)) return activities.items
    if (Array.isArray(activities)) return activities
    return []
  }, [activities])

  const selectedLabelIds = useMemo(
    () => new Set((Array.isArray(issue?.labels) ? issue.labels : []).map((label) => String(label?.id))),
    [issue?.labels],
  )

  const loadIssue = useCallback(async () => {
    if (!issueKey) return null
    const data = await issueApi.getIssue(issueKey)
    setIssue(data || null)
    setTitleDraft(String(data?.title ?? ''))
    setDescriptionDraft(String(data?.description ?? ''))
    return data || null
  }, [issueKey])

  const loadComments = useCallback(async () => {
    if (!issueKey) return
    setCommentsLoading(true)
    setCommentError('')
    try {
      const data = await commentApi.listComments(issueKey, { page: 1, perPage: 100 })
      setComments(data || { items: [] })
    } catch (err) {
      setComments({ items: [] })
      setCommentError(err?.message || t('common.loadError'))
    } finally {
      setCommentsLoading(false)
    }
  }, [issueKey, t])

  const loadAttachments = useCallback(async () => {
    if (!issueKey) return
    setAttachmentsLoading(true)
    try {
      const data = await attachmentApi.listAttachments(issueKey)
      setAttachments(Array.isArray(data) ? data : [])
    } catch {
      setAttachments([])
    } finally {
      setAttachmentsLoading(false)
    }
  }, [issueKey])

  const loadSubtasks = useCallback(async () => {
    if (!issueKey) return
    setSubtasksLoading(true)
    try {
      const data = await issueApi.listSubtasks(issueKey)
      setSubtasks(Array.isArray(data) ? data : [])
    } catch {
      setSubtasks([])
    } finally {
      setSubtasksLoading(false)
    }
  }, [issueKey])

  const loadActivity = useCallback(async () => {
    if (!issueKey) return
    setActivitiesLoading(true)
    try {
      const data = await activityApi.getIssueActivity(issueKey, { page: 1, perPage: 100 })
      setActivities(data || { items: [] })
    } catch {
      setActivities({ items: [] })
    } finally {
      setActivitiesLoading(false)
    }
  }, [issueKey])

  const loadLabels = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectLabels([])
      return
    }
    setLabelsLoading(true)
    try {
      const data = await labelApi.listLabels(projectId)
      setProjectLabels(Array.isArray(data) ? data : [])
    } catch {
      setProjectLabels([])
    } finally {
      setLabelsLoading(false)
    }
  }, [])

  const ensureUsersLoaded = useCallback(async (ids) => {
    const uniqueIds = Array.from(new Set((ids ?? []).filter(Boolean).map((id) => String(id))))
    const missingIds = uniqueIds.filter((id) => !mergedUsers[id])
    if (missingIds.length === 0) return

    const settled = await Promise.allSettled(missingIds.map((id) => userApi.getUser(id)))
    setUserCache((prev) => {
      const next = { ...prev }
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.id) {
          next[String(result.value.id)] = result.value
        } else {
          const id = missingIds[index]
          if (!next[id]) next[id] = { id, name: '', email: '', avatar_url: '' }
        }
      })
      return next
    })
  }, [mergedUsers])

  const refetchAll = useCallback(async () => {
    if (!issueKey) return
    setLoading(true)
    setError('')
    try {
      const data = await loadIssue()
      await Promise.all([
        loadComments(),
        loadAttachments(),
        loadSubtasks(),
        loadActivity(),
        loadLabels(data?.projectId),
      ])
    } catch (err) {
      setIssue(null)
      setError(err?.message || t('common.loadError'))
    } finally {
      setLoading(false)
    }
  }, [issueKey, loadActivity, loadAttachments, loadComments, loadIssue, loadLabels, loadSubtasks, t])

  useEffect(() => {
    refetchAll()
  }, [refetchAll])

  useEffect(() => {
    const userIds = [
      issue?.reporter?.id,
      issue?.assignee?.id,
      issue?.reporterId,
      issue?.assigneeId,
      ...commentItems.map((comment) => comment?.userId),
    ]
    ensureUsersLoaded(userIds)
  }, [commentItems, ensureUsersLoaded, issue?.assignee?.id, issue?.assigneeId, issue?.reporter?.id, issue?.reporterId])

  const handleDownloadAttachment = useCallback(async (att) => {
    if (!att?.id) return
    const res = await attachmentApi.downloadAttachment(att.id)
    const filename = parseFilenameFromContentDisposition(res?.contentDisposition) || att?.originalName || att?.filename || 'download'
    const url = URL.createObjectURL(res.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }, [])

  const patchIssueField = useCallback(async (field, value) => {
    if (!issueKey) return
    setSavingField(field)
    setError('')
    try {
      await issueApi.updateIssue(issueKey, { [field]: value })
      await Promise.all([loadIssue(), loadActivity()])
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
      throw err
    } finally {
      setSavingField('')
    }
  }, [issueKey, loadActivity, loadIssue, t])

  const handleTitleSave = useCallback(async () => {
    const next = String(titleDraft ?? '').trim()
    if (!next || next === String(issue?.title ?? '').trim()) {
      setTitleDraft(String(issue?.title ?? ''))
      return
    }
    await patchIssueField('title', next)
  }, [issue?.title, patchIssueField, titleDraft])

  const handleDescriptionSave = useCallback(async () => {
    const next = String(descriptionDraft ?? '').trim()
    const current = String(issue?.description ?? '').trim()
    if (next === current) {
      setDescriptionEditing(false)
      return
    }
    await patchIssueField('description', next)
    setDescriptionEditing(false)
  }, [descriptionDraft, issue?.description, patchIssueField])

  const handleSimpleSelectUpdate = useCallback(async (field, value) => {
    if (!value) return
    if (safeLower(issue?.[field]) === safeLower(value)) return
    await patchIssueField(field, value)
  }, [issue, patchIssueField])

  const handleStatusChange = useCallback(async (value) => {
    if (!issueKey || !value || safeLower(issue?.status) === safeLower(value)) return
    setSavingField('status')
    try {
      await issueApi.changeIssueStatus(issueKey, value)
      await Promise.all([loadIssue(), loadActivity()])
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setSavingField('')
    }
  }, [issue?.status, issueKey, loadActivity, loadIssue, t])

  const handleAssigneeChange = useCallback(async (value) => {
    if (!issueKey) return
    setSavingField('assigneeId')
    try {
      await issueApi.assignIssue(issueKey, value || null)
      await Promise.all([loadIssue(), loadActivity()])
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setSavingField('')
    }
  }, [issueKey, loadActivity, loadIssue, t])

  const handleDueDateChange = useCallback(async (value) => {
    if (!value) return
    await patchIssueField('dueDate', value)
  }, [patchIssueField])

  const handleDeleteIssue = useCallback(async () => {
    if (!issueKey) return
    if (!window.confirm(t('issues.detail.confirmDeleteIssue', { defaultValue: 'Delete this issue?' }))) return
    try {
      await issueApi.deleteIssue(issueKey)
      onBack?.()
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    }
  }, [issueKey, onBack, t])

  const handleAddComment = useCallback(async (event) => {
    event.preventDefault()
    const content = String(newCommentContent ?? '').trim()
    if (!content || !issueKey) return
    setNewCommentLoading(true)
    setCommentError('')
    try {
      await commentApi.addComment(issueKey, { content })
      setNewCommentContent('')
      await Promise.all([loadComments(), loadActivity()])
    } catch (err) {
      setCommentError(err?.message || t('common.actionFailed'))
    } finally {
      setNewCommentLoading(false)
    }
  }, [issueKey, loadActivity, loadComments, newCommentContent, t])

  const handleSaveEditedComment = useCallback(async (commentId) => {
    const content = String(editingCommentContent ?? '').trim()
    if (!content) return
    try {
      await commentApi.editComment(commentId, { content })
      setEditingCommentId('')
      setEditingCommentContent('')
      await Promise.all([loadComments(), loadActivity()])
    } catch (err) {
      setCommentError(err?.message || t('common.actionFailed'))
    }
  }, [editingCommentContent, loadActivity, loadComments, t])

  const handleDeleteComment = useCallback(async (commentId) => {
    if (!window.confirm(t('issues.detail.confirmDeleteComment', { defaultValue: 'Delete this comment?' }))) return
    try {
      await commentApi.deleteComment(commentId)
      await Promise.all([loadComments(), loadActivity()])
    } catch (err) {
      setCommentError(err?.message || t('common.actionFailed'))
    }
  }, [loadActivity, loadComments, t])

  const handleToggleLabel = useCallback(async (labelId) => {
    if (!issueKey || !labelId) return
    setSavingField('labels')
    try {
      if (selectedLabelIds.has(String(labelId))) {
        await labelApi.detachLabelFromIssue(issueKey, labelId)
      } else {
        await labelApi.attachLabelToIssue(issueKey, labelId)
      }
      await Promise.all([loadIssue(), loadActivity()])
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setSavingField('')
    }
  }, [issueKey, loadActivity, loadIssue, selectedLabelIds, t])

  const handleCreateSubtask = useCallback(async (event) => {
    event.preventDefault()
    const title = String(newSubtaskTitle ?? '').trim()
    if (!title || !issue?.projectId) return
    setNewSubtaskLoading(true)
    try {
      await issueApi.createIssue(issue.projectId, {
        title,
        type: 'subtask',
        priority: issue?.priority || 'medium',
        parentId: issue.id,
        sprintId: issue?.sprintId || null,
      })
      setNewSubtaskTitle('')
      await Promise.all([loadSubtasks(), loadActivity()])
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setNewSubtaskLoading(false)
    }
  }, [issue?.id, issue?.priority, issue?.projectId, issue?.sprintId, loadActivity, loadSubtasks, newSubtaskTitle, t])

  const statusLabel = useMemo(() => {
    const status = safeLower(issue?.status)
    return status ? fieldLabel(t, `issue.status.${status}`, status) : '-'
  }, [issue?.status, t])

  const typeLabel = useMemo(() => {
    const type = safeLower(issue?.type)
    return type ? fieldLabel(t, `issue.type.${type}`, type) : '-'
  }, [issue?.type, t])

  const priorityLabel = useMemo(() => {
    const value = safeLower(issue?.priority)
    return value ? fieldLabel(t, `priority.${value}`, value) : '-'
  }, [issue?.priority, t])

  const reporter = useMemo(() => {
    if (issue?.reporter?.id) return issue.reporter
    return mergedUsers[String(issue?.reporterId ?? '')] || null
  }, [issue?.reporter, issue?.reporterId, mergedUsers])

  const assignee = useMemo(() => {
    if (issue?.assignee?.id) return issue.assignee
    return mergedUsers[String(issue?.assigneeId ?? '')] || null
  }, [issue?.assignee, issue?.assigneeId, mergedUsers])

  return (
    <section className={`issue-detail panel ${embedded ? 'is-embedded' : ''}`} aria-label={t('issues.detail.aria', { defaultValue: 'Issue details' })}>
      {!embedded ? (
        <header className="issue-detail-head">
          <button type="button" className="issue-detail-back" onClick={onBack}>
            <FiArrowLeft /> {t('common.back')}
          </button>

          <div className="issue-detail-crumbs">
            <span>{t('common.project')}: {projectName || '-'}</span>
            <span className="issue-detail-key">{headline}</span>
          </div>
        </header>
      ) : null}

      {loading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
      {error ? <p className="dashboard-kicker issue-error">{error}</p> : null}

      {!loading && !error && issue ? (
        <div className="issue-detail-grid">
          <div className="issue-detail-main">
            <div className="issue-detail-hero">
              <div>
                <div className="issue-detail-meta">
                  <span className={`task-tag tone-${safeLower(issue?.type) || 'task'}`}>{typeLabel}</span>
                  <span className={`board-card-chip tone-${safeLower(issue?.status) || 'todo'}`}>{statusLabel}</span>
                  <span className={`task-priority tone-${safeLower(issue?.priority) || 'medium'}`}>{priorityLabel}</span>
                </div>

                <input
                  className="issue-detail-title-input"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      event.currentTarget.blur()
                    }
                    if (event.key === 'Escape') {
                      setTitleDraft(String(issue?.title ?? ''))
                      event.currentTarget.blur()
                    }
                  }}
                />
                {savingField === 'title' ? <p className="issue-saving">{t('common.saving')}</p> : null}
              </div>

              <button type="button" className="issue-danger-btn" onClick={handleDeleteIssue}>
                <FiTrash2 /> {t('common.delete')}
              </button>
            </div>

            <section className="issue-detail-section">
              <div className="issue-section-head">
                <h2>{t('issues.detail.description', { defaultValue: 'Description' })}</h2>
                {!descriptionEditing ? (
                  <button type="button" className="link-btn" onClick={() => setDescriptionEditing(true)}>
                    {t('common.edit')}
                  </button>
                ) : null}
              </div>

              {descriptionEditing ? (
                <div className="issue-detail-description">
                  <textarea
                    className="issue-detail-textarea"
                    rows="6"
                    value={descriptionDraft}
                    onChange={(event) => setDescriptionDraft(event.target.value)}
                  />
                  <div className="issue-inline-actions">
                    <button type="button" className="open-btn" onClick={handleDescriptionSave} disabled={savingField === 'description'}>
                      {savingField === 'description' ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setDescriptionDraft(String(issue?.description ?? ''))
                        setDescriptionEditing(false)
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="issue-detail-description issue-description-view" onClick={() => setDescriptionEditing(true)} role="button" tabIndex={0}>
                  {issue?.description ? (
                    <pre>{issue.description}</pre>
                  ) : (
                    <p className="muted">{t('issues.detail.noDescription', { defaultValue: 'No description. Click to add one.' })}</p>
                  )}
                </div>
              )}
            </section>

            <section className="issue-detail-section">
              <div className="issue-section-head">
                <h2>{t('issues.detail.subtasks', { defaultValue: 'Subtasks' })}</h2>
                <span className="issue-count-pill">{subtasks.length}</span>
              </div>
              {subtasksLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
              <div className="issue-subtask-list">
                {subtasks.map((subtask) => (
                  <article key={subtask?.id || subtask?.key} className="issue-subtask-card">
                    <span className="issue-subtask-key">{subtask?.key}</span>
                    <strong>{subtask?.title || '-'}</strong>
                    <span>{fieldLabel(t, `issue.status.${safeLower(subtask?.status)}`, String(subtask?.status || ''))}</span>
                  </article>
                ))}
                {!subtasksLoading && subtasks.length === 0 ? (
                  <p className="muted">{t('issues.detail.noSubtasks', { defaultValue: 'No subtasks yet' })}</p>
                ) : null}
              </div>
              <form className="issue-inline-form" onSubmit={handleCreateSubtask}>
                <input
                  className="issue-inline-input"
                  value={newSubtaskTitle}
                  onChange={(event) => setNewSubtaskTitle(event.target.value)}
                  placeholder={t('issues.detail.subtaskPlaceholder', { defaultValue: 'Add subtask title...' })}
                />
                <button type="submit" className="open-btn" disabled={newSubtaskLoading || !newSubtaskTitle.trim()}>
                  <FiPlus /> {newSubtaskLoading ? t('common.saving') : t('issues.detail.addSubtask', { defaultValue: 'Add subtask' })}
                </button>
              </form>
            </section>

            <section className="issue-detail-section">
              <h2>{t('issues.detail.attachments', { defaultValue: 'Attachments' })}</h2>
              {attachmentsLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
              {!attachmentsLoading && attachments.length === 0 ? (
                <p className="muted">{t('issues.detail.noAttachments', { defaultValue: 'No attachments' })}</p>
              ) : null}
              <div className="issue-attachment-list">
                {attachments.map((att) => (
                  <article key={att?.id} className="issue-attachment">
                    <div>
                      <p className="issue-attachment-name">{att?.originalName || att?.filename || t('common.untitled')}</p>
                      <p className="issue-attachment-sub">{formatDateTime(att?.createdAt, locale)}</p>
                    </div>
                    <button type="button" className="open-btn" onClick={() => handleDownloadAttachment(att)}>
                      <FiDownload /> {t('common.download', { defaultValue: 'Download' })}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="issue-detail-section">
              <div className="issue-section-head">
                <h2>{t('issues.detail.activity', { defaultValue: 'Activity & comments' })}</h2>
                <span className="issue-count-pill">{commentItems.length + activityItems.length}</span>
              </div>

              <div className="issue-activity-list">
                {activitiesLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
                {!activitiesLoading && activityItems.length === 0 ? (
                  <p className="muted">{t('issues.detail.noActivity', { defaultValue: 'No activity yet' })}</p>
                ) : null}
                {activityItems.map((activity) => {
                  const actor = mergedUsers[String(activity?.userId ?? '')]
                  const statusFrom = safeLower(activity?.oldValue)
                  const statusTo = safeLower(activity?.newValue)
                  const message = safeLower(activity?.action) === 'status_changed'
                    ? `${fieldLabel(t, `issue.status.${statusFrom}`, activity?.oldValue || '')} → ${fieldLabel(t, `issue.status.${statusTo}`, activity?.newValue || '')}`
                    : fieldLabel(t, `activity.actions.${safeLower(activity?.action)}`, activity?.action || 'updated')
                  return (
                    <article key={activity?.id} className="issue-activity-item">
                      <span className="issue-activity-icon"><FiClock /></span>
                      <div>
                        <p><strong>{actor?.name || actor?.email || t('common.unknown')}</strong> {message}</p>
                        <span>{formatDateTime(activity?.createdAt, locale)}</span>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="issue-comment-wrap">
                <h3>{t('issues.detail.comments', { defaultValue: 'Comments' })}</h3>
                {commentsLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
                {commentError ? <p className="dashboard-kicker issue-error">{commentError}</p> : null}
                {!commentsLoading && commentItems.length === 0 ? (
                  <p className="muted">{t('issues.detail.noComments', { defaultValue: 'No comments yet' })}</p>
                ) : null}

                <div className="issue-comment-list">
                  {commentItems.map((comment) => {
                    const author = mergedUsers[String(comment?.userId ?? '')]
                    const isEditing = editingCommentId === comment?.id
                    return (
                      <article key={comment?.id} className="issue-comment">
                        <div className="issue-comment-head">
                          <strong>{author?.name || author?.email || t('common.unknown')}</strong>
                          <span>{formatDateTime(comment?.updatedAt || comment?.createdAt, locale)}</span>
                        </div>

                        {isEditing ? (
                          <>
                            <textarea
                              className="issue-detail-textarea"
                              rows="4"
                              value={editingCommentContent}
                              onChange={(event) => setEditingCommentContent(event.target.value)}
                            />
                            <div className="issue-inline-actions">
                              <button type="button" className="open-btn" onClick={() => handleSaveEditedComment(comment.id)}>
                                {t('common.save')}
                              </button>
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => {
                                  setEditingCommentId('')
                                  setEditingCommentContent('')
                                }}
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="issue-comment-content">{comment?.content || ''}</p>
                            <div className="issue-inline-actions">
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => {
                                  setEditingCommentId(comment.id)
                                  setEditingCommentContent(String(comment?.content ?? ''))
                                }}
                              >
                                {t('common.edit')}
                              </button>
                              <button type="button" className="link-btn issue-danger-link" onClick={() => handleDeleteComment(comment.id)}>
                                {t('common.delete')}
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    )
                  })}
                </div>

                <form className="issue-comment-form" onSubmit={handleAddComment}>
                  <textarea
                    className="issue-detail-textarea"
                    rows="4"
                    value={newCommentContent}
                    onChange={(event) => setNewCommentContent(event.target.value)}
                    placeholder={t('issues.detail.addCommentPlaceholder', { defaultValue: 'Add a comment...' })}
                  />
                  <button type="submit" className="open-btn" disabled={newCommentLoading || !newCommentContent.trim()}>
                    {newCommentLoading ? t('common.saving') : t('issues.detail.postComment', { defaultValue: 'Post comment' })}
                  </button>
                </form>
              </div>
            </section>
          </div>

          <aside className="issue-detail-side">
            <div className="side-block">
              <h3>{t('issues.detail.fields', { defaultValue: 'Details' })}</h3>
              <dl className="kv">
                <div>
                  <dt>{t('issues.detail.assignee', { defaultValue: 'Assignee' })}</dt>
                  <dd>
                    <select
                      className="issue-detail-select"
                      value={String(issue?.assigneeId || '')}
                      onChange={(event) => handleAssigneeChange(event.target.value)}
                      disabled={savingField === 'assigneeId'}
                    >
                      <option value="">{t('common.unassigned', { defaultValue: 'Unassigned' })}</option>
                      {(Array.isArray(members) ? members : []).map((member) => {
                        const memberUser = mergedUsers[String(member?.userId ?? member?.id ?? '')]
                        const userId = String(member?.userId ?? member?.id ?? '')
                        return (
                          <option key={userId} value={userId}>
                            {memberUser?.name || memberUser?.email || member?.name || member?.email || 'Unknown'}
                          </option>
                        )
                      })}
                    </select>
                    {assignee ? <span className="issue-side-note">{assignee?.email || ''}</span> : null}
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.reporter', { defaultValue: 'Reporter' })}</dt>
                  <dd>
                    <strong>{reporter?.name || reporter?.email || '-'}</strong>
                    {reporter?.email ? <span className="issue-side-note">{reporter.email}</span> : null}
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.status', { defaultValue: 'Status' })}</dt>
                  <dd>
                    <select
                      className="issue-detail-select"
                      value={safeLower(issue?.status) || ''}
                      onChange={(event) => handleStatusChange(event.target.value)}
                      disabled={savingField === 'status'}
                    >
                      {ISSUE_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {fieldLabel(t, `issue.status.${status}`, status)}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.priority', { defaultValue: 'Priority' })}</dt>
                  <dd>
                    <select
                      className="issue-detail-select"
                      value={safeLower(issue?.priority) || ''}
                      onChange={(event) => handleSimpleSelectUpdate('priority', event.target.value)}
                      disabled={savingField === 'priority'}
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {fieldLabel(t, `priority.${priority}`, priority)}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.type', { defaultValue: 'Type' })}</dt>
                  <dd>
                    <select
                      className="issue-detail-select"
                      value={safeLower(issue?.type) || ''}
                      onChange={(event) => handleSimpleSelectUpdate('type', event.target.value)}
                      disabled={savingField === 'type'}
                    >
                      {ISSUE_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {fieldLabel(t, `issue.type.${type}`, type)}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.sprint', { defaultValue: 'Sprint' })}</dt>
                  <dd>{issue?.sprint?.name || '-'}</dd>
                </div>
                <div>
                  <dt>{t('issues.detail.dueDate', { defaultValue: 'Due date' })}</dt>
                  <dd>
                    <input
                      type="date"
                      className="issue-detail-select issue-detail-date"
                      value={formatDateInput(issue?.dueDate)}
                      onChange={(event) => handleDueDateChange(event.target.value)}
                    />
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.labels', { defaultValue: 'Labels' })}</dt>
                  <dd>
                    <div className="label-row">
                      {(Array.isArray(issue?.labels) ? issue.labels : []).map((label) => (
                        <span key={label?.id} className="label-chip" style={label?.color ? { background: label.color } : undefined}>
                          {label?.name}
                        </span>
                      ))}
                      {(!issue?.labels || issue.labels.length === 0) ? <span className="muted">-</span> : null}
                    </div>
                    <div className="issue-label-picker">
                      {labelsLoading ? <span className="muted">{t('common.loading')}</span> : null}
                      {projectLabels.map((label) => {
                        const isActive = selectedLabelIds.has(String(label?.id))
                        return (
                          <button
                            key={label?.id}
                            type="button"
                            className={`issue-label-option ${isActive ? 'is-active' : ''}`}
                            onClick={() => handleToggleLabel(label.id)}
                          >
                            <span className="issue-label-dot" style={label?.color ? { background: label.color } : undefined} />
                            {label?.name}
                          </button>
                        )
                      })}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.createdAt', { defaultValue: 'Created' })}</dt>
                  <dd>
                    <strong>{formatDateTime(issue?.createdAt, locale) || '-'}</strong>
                    <span className="issue-side-note">{relativeTime(issue?.createdAt, locale)}</span>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.updatedAt', { defaultValue: 'Updated' })}</dt>
                  <dd>
                    <strong>{formatDateTime(issue?.updatedAt, locale) || '-'}</strong>
                    <span className="issue-side-note">{relativeTime(issue?.updatedAt, locale)}</span>
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  )
}
