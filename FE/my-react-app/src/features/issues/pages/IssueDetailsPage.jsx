import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiDownload } from 'react-icons/fi'
import * as issueApi from '../api/issueApi'
import * as commentApi from '../../comments/api/commentApi'
import * as attachmentApi from '../../attachments/api/attachmentApi'
import './IssueDetailsPage.css'

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

export default function IssueDetailsPage({
  issueKey,
  onBack,
  projectName,
  locale = 'vi-VN',
  members = [],
  usersById = {},
}) {
  const { t } = useTranslation()
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

  // Comment form
  const [newCommentContent, setNewCommentContent] = useState('')
  const [newCommentLoading, setNewCommentLoading] = useState(false)
  const [newCommentError, setNewCommentError] = useState('')

  // Edit comment
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')
  const [editingCommentLoading, setEditingCommentLoading] = useState(false)

  // Assign issue
  const [assignLoading, setAssignLoading] = useState(false)

  // Inline field edits
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [priorityUpdating, setPriorityUpdating] = useState(false)
  const [typeUpdating, setTypeUpdating] = useState(false)

  const headline = useMemo(() => {
    if (!issue) return issueKey
    return `${issue?.key || issueKey}`
  }, [issue, issueKey])

  const refetch = useCallback(async () => {
    if (!issueKey) return
    setLoading(true)
    setError('')
    try {
      const data = await issueApi.getIssue(issueKey)
      setIssue(data || null)
    } catch (err) {
      setIssue(null)
      setError(err?.message || t('common.loadError'))
    } finally {
      setLoading(false)
    }
  }, [issueKey, t])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (!issueKey) return
    setCommentsLoading(true)
    commentApi.listComments(issueKey)
      .then((data) => {
        setComments(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setComments([])
      })
      .finally(() => {
        setCommentsLoading(false)
      })
  }, [issueKey])

  useEffect(() => {
    if (!issueKey) return
    setAttachmentsLoading(true)
    attachmentApi.listAttachments(issueKey)
      .then((data) => {
        setAttachments(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setAttachments([])
      })
      .finally(() => {
        setAttachmentsLoading(false)
      })
  }, [issueKey])

  const handleDownloadAttachment = useCallback(async (att) => {
    if (!att?.id) return
    const res = await attachmentApi.downloadAttachment(att.id)
    const filename = parseFilenameFromContentDisposition(res?.contentDisposition) || att?.originalName || att?.filename || 'download'

    const url = URL.createObjectURL(res.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [])

  // ─── Assign Issue ───────────────────────────────────────────────────────────
  const handleAssignIssue = useCallback(async (assigneeId) => {
    if (!issueKey) return
    setAssignLoading(true)
    try {
      const updated = await issueApi.assignIssue(issueKey, assigneeId)
      setIssue(updated || null)
    } catch (err) {
      console.error('Assign issue error:', err)
    } finally {
      setAssignLoading(false)
    }
  }, [issueKey])

  const handleChangeStatus = useCallback(async (nextStatus) => {
    if (!issueKey) return
    if (!nextStatus) return
    if (safeLower(issue?.status) === safeLower(nextStatus)) return
    setStatusUpdating(true)
    setError('')
    try {
      const updated = await issueApi.changeIssueStatus(issueKey, nextStatus)
      setIssue(updated || null)
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setStatusUpdating(false)
    }
  }, [issue?.status, issueKey, t])

  const handleChangePriority = useCallback(async (nextPriority) => {
    if (!issueKey) return
    if (!nextPriority) return
    if (safeLower(issue?.priority) === safeLower(nextPriority)) return
    setPriorityUpdating(true)
    setError('')
    try {
      const updated = await issueApi.updateIssue(issueKey, { priority: nextPriority })
      setIssue(updated || null)
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setPriorityUpdating(false)
    }
  }, [issue?.priority, issueKey, t])

  const handleChangeType = useCallback(async (nextType) => {
    if (!issueKey) return
    if (!nextType) return
    if (safeLower(issue?.type) === safeLower(nextType)) return
    setTypeUpdating(true)
    setError('')
    try {
      const updated = await issueApi.updateIssue(issueKey, { type: nextType })
      setIssue(updated || null)
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setTypeUpdating(false)
    }
  }, [issue?.type, issueKey, t])

  // ─── Comment Handlers ───────────────────────────────────────────────────────
  const handleAddComment = useCallback(async (event) => {
    event.preventDefault()
    const content = String(newCommentContent ?? '').trim()
    if (!content) return

    if (!issueKey) return
    setNewCommentLoading(true)
    setNewCommentError('')
    try {
      await commentApi.addComment(issueKey, { content })
      setNewCommentContent('')
      // Refetch comments
      const data = await commentApi.listComments(issueKey)
      setComments(Array.isArray(data) ? data : [])
    } catch (err) {
      setNewCommentError(err?.message || t('common.error'))
    } finally {
      setNewCommentLoading(false)
    }
  }, [issueKey, newCommentContent, t])

  const handleStartEditComment = useCallback((comment) => {
    if (!comment?.id) return
    setEditingCommentId(comment.id)
    setEditingCommentContent(String(comment?.content ?? '').trim())
  }, [])

  const handleCancelEditComment = useCallback(() => {
    setEditingCommentId(null)
    setEditingCommentContent('')
  }, [])

  const handleSaveEditComment = useCallback(async (commentId) => {
    const content = String(editingCommentContent ?? '').trim()
    if (!content) return

    setEditingCommentLoading(true)
    try {
      await commentApi.editComment(commentId, { content })
      // Refetch comments
      const data = await commentApi.listComments(issueKey)
      setComments(Array.isArray(data) ? data : [])
      setEditingCommentId(null)
      setEditingCommentContent('')
    } catch (err) {
      console.error('Edit comment error:', err)
    } finally {
      setEditingCommentLoading(false)
    }
  }, [issueKey, editingCommentContent])

  const handleDeleteComment = useCallback(async (commentId) => {
    if (!window.confirm(t('issues.detail.confirmDeleteComment', { defaultValue: 'Delete this comment?' }))) {
      return
    }
    try {
      await commentApi.deleteComment(commentId)
      // Refetch comments
      const data = await commentApi.listComments(issueKey)
      setComments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Delete comment error:', err)
    }
  }, [issueKey, t])

  const statusLabel = useMemo(() => {
    const status = safeLower(issue?.status)
    if (!status) return '-'
    return t(`issue.status.${status}`, { defaultValue: status })
  }, [issue?.status, t])

  const typeLabel = useMemo(() => {
    const type = safeLower(issue?.type)
    if (!type) return '-'
    return t(`issue.type.${type}`, { defaultValue: type })
  }, [issue?.type, t])

  const typeTone = useMemo(() => {
    const type = safeLower(issue?.type)
    if (type === 'bug') return 'amber'
    if (type === 'task') return 'indigo'
    if (type === 'story') return 'blue'
    if (type === 'epic') return 'violet'
    if (type === 'subtask') return 'green'
    return 'blue'
  }, [issue?.type])

  const priorityTone = useMemo(() => {
    const p = safeLower(issue?.priority)
    if (p === 'critical' || p === 'high') return 'high'
    if (p === 'medium') return 'medium'
    return 'low'
  }, [issue?.priority])

  const priorityLabel = useMemo(() => {
    const p = safeLower(issue?.priority)
    if (!p) return '-'
    return t(`priority.${p}`, { defaultValue: p })
  }, [issue?.priority, t])

  const createdAt = useMemo(() => formatDateTime(issue?.createdAt, locale), [issue?.createdAt, locale])
  const updatedAt = useMemo(() => formatDateTime(issue?.updatedAt, locale), [issue?.updatedAt, locale])

  return (
    <section className="issue-detail panel" aria-label={t('issues.detail.aria', { defaultValue: 'Issue details' })}>
      <header className="issue-detail-head">
        <button type="button" className="issue-detail-back" onClick={onBack}>
          <FiArrowLeft /> {t('common.back')}
        </button>

        <div className="issue-detail-crumbs">
          <span>{t('common.project')}: {projectName || '-'}</span>
          <span className="issue-detail-key">{headline}</span>
        </div>
      </header>

      {loading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
      {error ? <p className="dashboard-kicker">{error}</p> : null}

      {!loading && !error && issue ? (
        <div className="issue-detail-grid">
          <div className="issue-detail-main">
            <h1 className="issue-detail-title">{issue?.title || '-'}</h1>

            <div className="issue-detail-meta">
              <span className={`task-tag tone-${typeTone}`}>{typeLabel}</span>
              <span className={`board-card-chip tone-${safeLower(issue?.status) || 'todo'}`}>{statusLabel}</span>
              <span className={`task-priority tone-${priorityTone}`}>{priorityLabel}</span>
            </div>

            <section className="issue-detail-section">
              <h2>{t('issues.detail.description', { defaultValue: 'Description' })}</h2>
              <div className="issue-detail-description">
                {issue?.description ? (
                  <pre>{issue.description}</pre>
                ) : (
                  <p className="muted">{t('issues.detail.noDescription', { defaultValue: 'No description' })}</p>
                )}
              </div>
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
              <h2>{t('issues.detail.comments', { defaultValue: 'Comments' })}</h2>
              {commentsLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
              {!commentsLoading && comments.length === 0 ? (
                <p className="muted">{t('issues.detail.noComments', { defaultValue: 'No comments yet' })}</p>
              ) : null}

              <div className="issue-comment-list">
                {comments.map((c) => (
                  <article key={c?.id} className="issue-comment">
                    {editingCommentId === c?.id ? (
                      <div>
                        <textarea
                          className="issue-detail-textarea"
                          value={editingCommentContent}
                          onChange={(e) => setEditingCommentContent(e.target.value)}
                          rows="3"
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="open-btn"
                            onClick={() => handleSaveEditComment(c.id)}
                            disabled={editingCommentLoading}
                          >
                            {editingCommentLoading ? t('common.saving') : t('common.save')}
                          </button>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={handleCancelEditComment}
                            disabled={editingCommentLoading}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="issue-comment-head">
                          <strong>{c?.author?.name || c?.author?.username || t('common.unknown')}</strong>
                          <span>{formatDateTime(c?.createdAt, locale)}</span>
                        </div>
                        <p className="issue-comment-content">{c?.content || ''}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => handleStartEditComment(c)}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            className="link-btn"
                            style={{ color: '#d32f2f' }}
                            onClick={() => handleDeleteComment(c.id)}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>

              <form onSubmit={handleAddComment} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                {newCommentError ? <p style={{ color: '#d32f2f', marginBottom: '0.5rem' }}>{newCommentError}</p> : null}
                <textarea
                  className="issue-detail-textarea"
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  placeholder={t('issues.detail.addCommentPlaceholder', { defaultValue: 'Add a comment...' })}
                  rows="3"
                />
                <button
                  type="submit"
                  className="open-btn"
                  disabled={newCommentLoading || !newCommentContent.trim()}
                >
                  {newCommentLoading ? t('common.posting') : t('issues.detail.postComment', { defaultValue: 'Post comment' })}
                </button>
              </form>
            </section>
          </div>

          <aside className="issue-detail-side">
            <div className="side-block">
              <h3>{t('issues.detail.fields', { defaultValue: 'Fields' })}</h3>
              <dl className="kv">
                <div>
                  <dt>{t('issues.detail.status', { defaultValue: 'Status' })}</dt>
                  <dd style={{ minHeight: '1.5rem', display: 'flex', alignItems: 'center' }}>
                    <select
                      className="issue-detail-select"
                      value={safeLower(issue?.status) || ''}
                      onChange={(e) => handleChangeStatus(e.target.value)}
                      disabled={statusUpdating}
                    >
                      {['todo', 'in_progress', 'in_review', 'done', 'cancelled'].map((s) => (
                        <option key={s} value={s}>{t(`issue.status.${s}`, { defaultValue: s })}</option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.priority', { defaultValue: 'Priority' })}</dt>
                  <dd style={{ minHeight: '1.5rem', display: 'flex', alignItems: 'center' }}>
                    <select
                      className="issue-detail-select"
                      value={safeLower(issue?.priority) || ''}
                      onChange={(e) => handleChangePriority(e.target.value)}
                      disabled={priorityUpdating}
                    >
                      {['critical', 'high', 'medium', 'low', 'trivial'].map((p) => (
                        <option key={p} value={p}>{t(`priority.${p}`, { defaultValue: p })}</option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.type', { defaultValue: 'Type' })}</dt>
                  <dd style={{ minHeight: '1.5rem', display: 'flex', alignItems: 'center' }}>
                    <select
                      className="issue-detail-select"
                      value={safeLower(issue?.type) || ''}
                      onChange={(e) => handleChangeType(e.target.value)}
                      disabled={typeUpdating}
                    >
                      {['task', 'bug', 'story', 'epic', 'subtask'].map((tp) => (
                        <option key={tp} value={tp}>{t(`issue.type.${tp}`, { defaultValue: tp })}</option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.assignee', { defaultValue: 'Assignee' })}</dt>
                  <dd style={{ cursor: 'pointer', minHeight: '1.5rem', display: 'flex', alignItems: 'center' }}>
                    <select
                      className="issue-detail-select"
                      value={String(issue?.assigneeId || '')}
                      onChange={(e) => handleAssignIssue(e.target.value || null)}
                      disabled={assignLoading}
                    >
                      <option value="">{t('common.unassigned', { defaultValue: 'Unassigned' })}</option>
                      {(Array.isArray(members) ? members : []).map((m) => (
                        <option key={m?.userId || m?.id} value={String(m?.userId ?? '')}>
                          {usersById?.[String(m?.userId)]?.name
                            || usersById?.[String(m?.userId)]?.email
                            || m?.name
                            || m?.username
                            || m?.email
                            || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.reporter', { defaultValue: 'Reporter' })}</dt>
                  <dd>{issue?.reporter?.name || issue?.reporter?.username || '-'}</dd>
                </div>
                <div>
                  <dt>{t('issues.detail.sprint', { defaultValue: 'Sprint' })}</dt>
                  <dd>{issue?.sprint?.name || '-'}</dd>
                </div>
                <div>
                  <dt>{t('issues.detail.labels', { defaultValue: 'Labels' })}</dt>
                  <dd>
                    <div className="label-row">
                      {(Array.isArray(issue?.labels) ? issue.labels : []).length === 0 ? (
                        <span className="muted">-</span>
                      ) : (
                        (issue.labels || []).map((lb) => (
                          <span key={lb?.id || lb?.name} className="label-chip" style={lb?.color ? { background: lb.color } : undefined}>
                            {lb?.name || '-'}
                          </span>
                        ))
                      )}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt>{t('issues.detail.createdAt', { defaultValue: 'Created' })}</dt>
                  <dd>{createdAt || '-'}</dd>
                </div>
                <div>
                  <dt>{t('issues.detail.updatedAt', { defaultValue: 'Updated' })}</dt>
                  <dd>{updatedAt || '-'}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  )
}
