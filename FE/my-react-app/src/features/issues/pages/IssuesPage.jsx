import { useEffect, useMemo, useState } from 'react'
import { FiCheckSquare, FiPlus, FiSearch } from 'react-icons/fi'
import { priorityDisplay, safeLower } from '../../kanban/kanbanUtils'
import IssueDetailsPage from './IssueDetailsPage'

function statusLabel(t, value) {
  const key = safeLower(value)
  return key ? t(`issue.status.${key}`, { defaultValue: key }) : '-'
}

function issueTypeLabel(t, value) {
  const key = safeLower(value)
  return key ? t(`issue.type.${key}`, { defaultValue: key }) : '-'
}

function sortIssues(items, sortMode) {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, trivial: 4 }
  const next = [...items]

  if (sortMode === 'updated') {
    return next.sort((a, b) => new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime())
  }

  if (sortMode === 'created') {
    return next.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
  }

  return next.sort((a, b) => {
    const pa = priorityOrder[safeLower(a?.priority)] ?? 99
    const pb = priorityOrder[safeLower(b?.priority)] ?? 99
    if (pa !== pb) return pa - pb
    return String(a?.key || '').localeCompare(String(b?.key || ''))
  })
}

export default function IssuesPage({
  t,
  projectName,
  issues = [],
  selectedIssueKey,
  onSelectIssue,
  onOpenCreateIssue,
  issuesLoading,
  issuesError,
  locale,
  members,
  usersById,
  active = true,
}) {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState('priority')

  const filteredIssues = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase()
    const source = Array.isArray(issues) ? issues : []
    const filtered = normalizedQuery
      ? source.filter((issue) => {
        const haystack = `${issue?.key || ''} ${issue?.title || ''} ${issue?.description || ''}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
      : source

    return sortIssues(filtered, sortMode)
  }, [issues, query, sortMode])

  const selectedIssue = useMemo(() => {
    if (!filteredIssues.length) return null
    return filteredIssues.find((issue) => String(issue?.key) === String(selectedIssueKey)) || filteredIssues[0]
  }, [filteredIssues, selectedIssueKey])

  useEffect(() => {
    if (!active) return
    if (!selectedIssue?.key) return
    if (String(selectedIssueKey || '') === String(selectedIssue.key)) return
    onSelectIssue?.(selectedIssue.key, { replace: true })
  }, [active, onSelectIssue, selectedIssue?.key, selectedIssueKey])

  return (
    <section className="issues-browser" aria-label={t('issues.title', { defaultValue: 'Issues' })}>
      <aside className="issues-list-pane">
        <header className="issues-list-head">
          <div>
            <h2>{t('issues.title', { defaultValue: 'Issues' })}</h2>
            <p>{projectName || t('projects.noProjectSelected')}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onOpenCreateIssue} aria-label={t('issues.create.submit')}>
            <FiPlus />
          </button>
        </header>

        <div className="issues-list-tools">
          <label className="issue-search issues-search" htmlFor="issues-browser-search">
            <FiSearch className="issue-search-icon" aria-hidden="true" />
            <input
              id="issues-browser-search"
              type="search"
              placeholder={t('issues.searchPlaceholder', { defaultValue: 'Search issues...' })}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <select className="inline-select" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="priority">{t('issues.sort.priority', { defaultValue: 'Order by priority' })}</option>
            <option value="updated">{t('issues.sort.updated', { defaultValue: 'Recently updated' })}</option>
            <option value="created">{t('issues.sort.created', { defaultValue: 'Recently created' })}</option>
          </select>
        </div>

        {issuesLoading ? <p className="dashboard-kicker issues-list-message">{t('common.loading')}</p> : null}
        {issuesError ? <p className="dashboard-kicker issues-list-message">{issuesError}</p> : null}

        <div className="issues-list">
          {!issuesLoading && filteredIssues.length === 0 ? (
            <article className="issues-empty">
              <h3>{t('reports.empty', { defaultValue: 'No issues found' })}</h3>
              <p>{t('reports.emptyHint', { defaultValue: 'Try changing filters or search.' })}</p>
            </article>
          ) : null}

          {filteredIssues.map((issue) => {
            const isActive = String(issue?.key) === String(selectedIssue?.key)
            const pr = priorityDisplay(issue?.priority)
            return (
              <button
                key={issue?.id || issue?.key}
                type="button"
                className={`issues-list-item ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelectIssue?.(issue?.key)}
              >
                <span className={`issue-type-dot is-${safeLower(issue?.type) || 'task'}`}>
                  <FiCheckSquare />
                </span>
                <span className="issues-list-copy">
                  <span className="issues-list-key">{issue?.key}</span>
                  <strong>{issue?.title || '-'}</strong>
                  <span>
                    {statusLabel(t, issue?.status)}
                    {' · '}
                    {t(`priority.${safeLower(issue?.priority) || pr.tone}`, { defaultValue: pr.label })}
                    {' · '}
                    {issueTypeLabel(t, issue?.type)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="issues-detail-pane">
        {selectedIssue?.key ? (
          <>
            <header className="issues-detail-head">
              <div>
                <p className="dashboard-kicker">{projectName || t('common.project')}</p>
                <h2>{selectedIssue.key}</h2>
              </div>
              <span className="issues-position">
                {filteredIssues.findIndex((issue) => String(issue?.key) === String(selectedIssue.key)) + 1} / {filteredIssues.length}
              </span>
            </header>

            <IssueDetailsPage
              key={selectedIssue.key}
              issueKey={selectedIssue.key}
              projectName={projectName}
              locale={locale}
              members={members}
              usersById={usersById}
              embedded
            />
          </>
        ) : (
          <section className="issues-no-selection">
            <h2>{t('issues.emptySelection', { defaultValue: 'Select an issue' })}</h2>
            <p>{t('issues.emptySelectionHint', { defaultValue: 'Choose an issue from the list to see details.' })}</p>
          </section>
        )}
      </main>
    </section>
  )
}
