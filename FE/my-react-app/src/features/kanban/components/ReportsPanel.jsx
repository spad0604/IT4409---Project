import { useMemo, useState } from 'react'
import { formatShortDate, priorityDisplay, safeLower, toInitials } from '../kanbanUtils'

const STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'trivial']
const TYPE_OPTIONS = ['task', 'bug', 'story', 'epic', 'subtask']

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

export default function ReportsPanel({
  t,
  projectName,
  issues,
  issuesTotal,
  issuesLoading,
  issuesError,
  activeLocale,
  usersById,
  onOpenIssueDetails,
}) {
  const [search, setSearch] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [type, setType] = useState('')

  const issueItems = useMemo(() => (Array.isArray(issues) ? issues : []), [issues])

  const assigneeOptions = useMemo(() => {
    const ids = new Set()
    for (const it of issueItems) {
      if (it?.assigneeId) ids.add(String(it.assigneeId))
    }
    return Array.from(ids)
      .map((id) => ({
        id,
        label: usersById?.[id]?.name || usersById?.[id]?.email || id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [issueItems, usersById])

  const filtered = useMemo(() => {
    const q = normalizeText(search)
    return issueItems.filter((it) => {
      if (!it) return false
      if (assigneeId && String(it?.assigneeId ?? '') !== String(assigneeId)) return false
      if (status && safeLower(it?.status) !== safeLower(status)) return false
      if (priority && safeLower(it?.priority) !== safeLower(priority)) return false
      if (type && safeLower(it?.type) !== safeLower(type)) return false
      if (!q) return true
      const hay = `${it?.key || ''} ${it?.title || ''} ${it?.description || ''}`
      return normalizeText(hay).includes(q)
    })
  }, [assigneeId, issueItems, priority, search, status, type])

  const sorted = useMemo(() => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, trivial: 4 }
    return [...filtered].sort((a, b) => {
      const pa = order[safeLower(a?.priority)] ?? 99
      const pb = order[safeLower(b?.priority)] ?? 99
      if (pa !== pb) return pa - pb
      return safeLower(a?.key).localeCompare(safeLower(b?.key))
    })
  }, [filtered])

  const totalCount = Number.isFinite(Number(issuesTotal))
    ? Number(issuesTotal)
    : sorted.length

  const byStatus = useMemo(() => {
    const counts = new Map()
    for (const issue of issueItems) {
      const key = safeLower(issue?.status) || 'unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([key, count]) => ({ key, count }))
  }, [issueItems])

  const byType = useMemo(() => {
    const counts = new Map()
    for (const issue of issueItems) {
      const key = safeLower(issue?.type) || 'unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([key, count]) => ({ key, count }))
  }, [issueItems])

  const byAssignee = useMemo(() => {
    const counts = new Map()
    for (const issue of issueItems) {
      const key = String(issue?.assigneeId || 'unassigned')
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        count,
        label: key === 'unassigned'
          ? t('common.unassigned', { defaultValue: 'Unassigned' })
          : usersById?.[key]?.name || usersById?.[key]?.email || key,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [issueItems, t, usersById])

  const doneCount = issueItems.filter((issue) => safeLower(issue?.status) === 'done').length
  const activeCount = issueItems.filter((issue) => safeLower(issue?.status) === 'in_progress').length
  const reviewCount = issueItems.filter((issue) => safeLower(issue?.status) === 'in_review').length

  const renderMiniBars = (items, labelRenderer) => (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      {items.map((item) => {
        const width = totalCount > 0 ? Math.max(8, Math.round((item.count / totalCount) * 100)) : 0
        return (
          <div key={item.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#344054' }}>{labelRenderer(item)}</span>
              <strong style={{ fontSize: '0.72rem' }}>{item.count}</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${width}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <section className="panel" aria-label={t('reports.aria', { defaultValue: 'Reports' })}>
      <header className="panel-head">
        <div>
          <h2>{t('reports.title', { defaultValue: 'Reports' })}</h2>
          <p>{projectName ? `${t('common.project')}: ${projectName}` : t('projects.noProjectSelected')}</p>
        </div>

        <p className="dashboard-kicker">{t('reports.total', { defaultValue: 'Total issues' })}: {totalCount}</p>
      </header>

      <section className="stats-overview" style={{ marginBottom: '1rem' }}>
        <article className="stat-card">
          <span>{t('reports.total', { defaultValue: 'Total issues' })}</span>
          <strong>{totalCount}</strong>
        </article>
        <article className="stat-card">
          <span>{t('issue.status.done', { defaultValue: 'Done' })}</span>
          <strong>{doneCount}</strong>
        </article>
        <article className="stat-card">
          <span>{t('issue.status.in_progress', { defaultValue: 'In Progress' })}</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="stat-card">
          <span>{t('issue.status.in_review', { defaultValue: 'In Review' })}</span>
          <strong>{reviewCount}</strong>
        </article>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
        <article className="panel" style={{ padding: '0.9rem' }}>
          <header className="panel-head">
            <h2>{t('reports.byStatus', { defaultValue: 'By status' })}</h2>
          </header>
          {renderMiniBars(byStatus, (item) => t(`issue.status.${item.key}`, { defaultValue: item.key }))}
        </article>

        <article className="panel" style={{ padding: '0.9rem' }}>
          <header className="panel-head">
            <h2>{t('reports.byType', { defaultValue: 'By type' })}</h2>
          </header>
          {renderMiniBars(byType, (item) => t(`issue.type.${item.key}`, { defaultValue: item.key }))}
        </article>

        <article className="panel" style={{ padding: '0.9rem' }}>
          <header className="panel-head">
            <h2>{t('reports.byAssignee', { defaultValue: 'Team workload' })}</h2>
          </header>
          {renderMiniBars(byAssignee, (item) => item.label)}
        </article>
      </section>

      <div style={{ display: 'grid', gap: '0.55rem' }}>
        <label className="issue-search" htmlFor="reports-search" style={{ maxWidth: 'unset' }}>
          <input
            id="reports-search"
            type="search"
            placeholder={t('reports.searchPlaceholder', { defaultValue: 'Search issues…' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.5rem' }}>
          <label className="inline-field">
            <span className="inline-label">{t('reports.filters.assignee', { defaultValue: 'Assignee' })}</span>
            <select className="inline-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">{t('reports.filters.all', { defaultValue: 'All' })}</option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </label>

          <label className="inline-field">
            <span className="inline-label">{t('reports.filters.status', { defaultValue: 'Status' })}</span>
            <select className="inline-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('reports.filters.all', { defaultValue: 'All' })}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{t(`issue.status.${s}`, { defaultValue: s })}</option>
              ))}
            </select>
          </label>

          <label className="inline-field">
            <span className="inline-label">{t('reports.filters.priority', { defaultValue: 'Priority' })}</span>
            <select className="inline-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">{t('reports.filters.all', { defaultValue: 'All' })}</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{t(`priority.${p}`, { defaultValue: p })}</option>
              ))}
            </select>
          </label>

          <label className="inline-field">
            <span className="inline-label">{t('reports.filters.type', { defaultValue: 'Type' })}</span>
            <select className="inline-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t('reports.filters.all', { defaultValue: 'All' })}</option>
              {TYPE_OPTIONS.map((tp) => (
                <option key={tp} value={tp}>{t(`issue.type.${tp}`, { defaultValue: tp })}</option>
              ))}
            </select>
          </label>
        </div>

        {issuesLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
        {issuesError ? <p className="dashboard-kicker">{issuesError}</p> : null}

        <div className="assigned-list">
          {sorted.length === 0 && !issuesLoading ? (
            <article className="assigned-item">
              <div>
                <h3>{t('reports.empty', { defaultValue: 'No issues found' })}</h3>
                <p>{t('reports.emptyHint', { defaultValue: 'Try changing filters or search.' })}</p>
              </div>
            </article>
          ) : null}

          {sorted.map((issue) => {
            const pr = priorityDisplay(issue?.priority)
            const priorityKey = safeLower(issue?.priority)
            const due = formatShortDate(issue?.dueDate, activeLocale)
            const assignee = issue?.assigneeId ? usersById?.[String(issue.assigneeId)] : null
            const who = assignee?.name || assignee?.email || ''
            const initials = toInitials(who)
            return (
              <article key={issue?.key} className="assigned-item">
                <div>
                  <p className="task-code">{issue?.key}</p>
                  <h3>{issue?.title}</h3>
                  <p>
                    {t(`issue.status.${safeLower(issue?.status)}`, { defaultValue: String(issue?.status || '-') })}
                    {' · '}
                    {priorityKey ? t(`priority.${priorityKey}`, { defaultValue: pr.label }) : pr.label}
                    {issue?.type ? ` · ${t(`issue.type.${safeLower(issue.type)}`, { defaultValue: String(issue.type) })}` : ''}
                    {due ? ` · ${t('common.due')}: ${due}` : ''}
                    {initials ? ` · ${t('common.assignee')}: ${initials}` : ''}
                  </p>
                </div>
                <button type="button" className="open-btn" onClick={() => onOpenIssueDetails?.(issue?.key)}>
                  {t('common.open')}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
