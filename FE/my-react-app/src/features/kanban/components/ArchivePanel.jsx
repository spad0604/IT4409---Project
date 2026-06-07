import { useMemo } from 'react'
import { formatShortDate, priorityDisplay, safeLower, toInitials } from '../kanbanUtils'

export default function ArchivePanel({
  t,
  projectName,
  issues,
  issuesLoading,
  issuesError,
  activeLocale,
  usersById,
  onOpenIssueDetails,
}) {
  const issueItems = useMemo(() => (Array.isArray(issues) ? issues : []), [issues])

  const archived = useMemo(() => {
    return issueItems.filter((i) => {
      const status = safeLower(i?.status)
      return status === 'done' || status === 'closed' || status === 'complete'
    })
  }, [issueItems])

  return (
    <section className="placeholder-panel panel" aria-label={t('archive.aria', { defaultValue: 'Archive' })}>
      <header className="panel-head">
        <div>
          <h2>{t('archive.title', { defaultValue: 'Archive' })}</h2>
          <p>{projectName ? `${t('common.project')}: ${projectName}` : t('projects.noProjectSelected')}</p>
        </div>
      </header>

      {issuesLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
      {issuesError ? <p className="dashboard-kicker">{issuesError}</p> : null}

      <div className="assigned-list">
        {archived.length === 0 ? (
          <article className="assigned-item">
            <div>
              <h3>{t('archive.empty', { defaultValue: 'Nothing archived yet' })}</h3>
              <p>{t('archive.emptyHint', { defaultValue: 'Completed issues will appear here.' })}</p>
            </div>
          </article>
        ) : null}

        {archived.map((issue) => {
          const pr = priorityDisplay(issue?.priority)
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
                  {t(`priority.${pr.tone}`, { defaultValue: pr.label })}
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
    </section>
  )
}
