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
}) {
  const { t } = useTranslation()
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

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
              <span className="meta-chip">{typeLabel}</span>
              <span className="meta-chip">{statusLabel}</span>
              <span className="meta-chip">{priorityLabel}</span>
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
                    <div className="issue-comment-head">
                      <strong>{c?.author?.name || c?.author?.username || t('common.unknown')}</strong>
                      <span>{formatDateTime(c?.createdAt, locale)}</span>
                    </div>
                    <p className="issue-comment-content">{c?.content || ''}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="issue-detail-side">
            <div className="side-block">
              <h3>{t('issues.detail.fields', { defaultValue: 'Fields' })}</h3>
              <dl className="kv">
                <div>
                  <dt>{t('issues.detail.status', { defaultValue: 'Status' })}</dt>
                  <dd>{statusLabel}</dd>
                </div>
                <div>
                  <dt>{t('issues.detail.assignee', { defaultValue: 'Assignee' })}</dt>
                  <dd>{issue?.assignee?.name || issue?.assignee?.username || '-'}</dd>
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
