import SprintPanel from './SprintPanel'
import { formatShortDate, priorityDisplay, safeLower, toInitials } from '../../kanban/kanbanUtils'

function IssueRow({ t, issue, activeLocale, usersById, sprintOptions, onOpenIssueDetails, onMoveIssue }) {
  const pr = priorityDisplay(issue?.priority)
  const assignee = issue?.assigneeId ? usersById[String(issue.assigneeId)] : null
  const due = formatShortDate(issue?.dueDate, activeLocale)

  return (
    <article className="assigned-item backlog-issue-row">
      <div>
        <p className="task-code">{issue?.key}</p>
        <h3>{issue?.title}</h3>
        <p>
          {t(`issue.status.${safeLower(issue?.status)}`, { defaultValue: String(issue?.status || '-') })}
          {' · '}
          {t(`priority.${safeLower(issue?.priority) || pr.tone}`, { defaultValue: pr.label })}
          {due ? ` · ${t('common.due')}: ${due}` : ''}
          {assignee ? ` · ${t('common.assignee')}: ${toInitials(assignee?.name || assignee?.email || '')}` : ''}
        </p>
        {Array.isArray(issue?.labels) && issue.labels.length > 0 ? (
          <div className="label-row" style={{ marginTop: '0.45rem' }}>
            {issue.labels.map((label) => (
              <span key={label?.id || label?.name} className="label-chip" style={label?.color ? { background: label.color } : undefined}>
                {label?.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: '0.45rem', justifyItems: 'end' }}>
        <select
          className="inline-select"
          value={String(issue?.sprintId || 'backlog')}
          onChange={(e) => onMoveIssue?.(issue?.key, e.target.value === 'backlog' ? '' : e.target.value)}
        >
          <option value="backlog">{t('backlog.title', { defaultValue: 'Backlog' })}</option>
          {sprintOptions.map((sprint) => (
            <option key={sprint?.id} value={sprint?.id}>{sprint?.name}</option>
          ))}
        </select>
        <button type="button" className="open-btn" onClick={() => onOpenIssueDetails?.(issue?.key)}>
          {t('common.open')}
        </button>
      </div>
    </article>
  )
}

export default function BacklogView({
  t,
  projectName,
  sprints = [],
  issueItems = [],
  backlogLoading,
  issuesLoading,
  issuesError,
  activeLocale,
  usersById,
  onOpenIssueDetails,
  onOpenCreateSprint,
  onStartSprint,
  onCompleteSprint,
  onMoveIssue,
  onEditSprint,
}) {
  const sprintMap = new Map((Array.isArray(sprints) ? sprints : []).map((sprint) => [String(sprint?.id), sprint]))
  const groupedIssues = new Map()
  const backlogItems = []

  for (const issue of Array.isArray(issueItems) ? issueItems : []) {
    const sprintId = String(issue?.sprintId || '')
    if (!sprintId) {
      backlogItems.push(issue)
      continue
    }
    if (!groupedIssues.has(sprintId)) groupedIssues.set(sprintId, [])
    groupedIssues.get(sprintId).push(issue)
  }

  const sortedSprints = [...sprintMap.values()].sort((a, b) => {
    const order = { active: 0, planning: 1, completed: 2 }
    const oa = order[String(a?.status || '').toLowerCase()] ?? 9
    const ob = order[String(b?.status || '').toLowerCase()] ?? 9
    if (oa !== ob) return oa - ob
    return String(a?.name || '').localeCompare(String(b?.name || ''))
  })

  return (
    <section className="panel" aria-label={t('backlog.title')}>
      <header className="panel-head">
        <div>
          <h2>{t('backlog.title')}</h2>
          <p>{projectName ? `${t('common.project')}: ${projectName}` : t('projects.noProjectSelected')}</p>
        </div>
        <button type="button" className="create-issue-btn" onClick={onOpenCreateSprint}>
          {t('sprints.create.submit', { defaultValue: 'Create sprint' })}
        </button>
      </header>

      {issuesLoading || backlogLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
      {issuesError ? <p className="dashboard-kicker">{issuesError}</p> : null}

      <div className="backlog-board">
        {sortedSprints.map((sprint) => {
          const sprintIssues = groupedIssues.get(String(sprint?.id)) || []
          return (
            <section key={sprint?.id} className="backlog-group">
              <SprintPanel
                t={t}
                sprint={sprint}
                issues={sprintIssues}
                activeLocale={activeLocale}
                onStartSprint={onStartSprint}
                onCompleteSprint={onCompleteSprint}
                onEditSprint={onEditSprint}
              />

              <div className="assigned-list">
                {sprintIssues.length === 0 ? (
                  <article className="assigned-item">
                    <div>
                      <h3>{t('backlog.emptySprint', { defaultValue: 'No issues in this sprint' })}</h3>
                      <p>{t('backlog.moveHint', { defaultValue: 'Move issues here from the backlog using the sprint selector.' })}</p>
                    </div>
                  </article>
                ) : null}
                {sprintIssues.map((issue) => (
                  <IssueRow
                    key={issue?.id || issue?.key}
                    t={t}
                    issue={issue}
                    activeLocale={activeLocale}
                    usersById={usersById}
                    sprintOptions={sortedSprints}
                    onOpenIssueDetails={onOpenIssueDetails}
                    onMoveIssue={onMoveIssue}
                  />
                ))}
              </div>
            </section>
          )
        })}

        <section className="backlog-group">
          <header className="panel-head">
            <div>
              <h2>{t('backlog.title')}</h2>
              <p>{t('backlog.subtitle', { defaultValue: 'Issues not assigned to a sprint' })}</p>
            </div>
          </header>

          <div className="assigned-list">
            {backlogItems.length === 0 ? (
              <article className="assigned-item">
                <div>
                  <h3>{t('backlog.empty')}</h3>
                  <p>{t('backlog.emptyHint')}</p>
                </div>
              </article>
            ) : null}
            {backlogItems.map((issue) => (
              <IssueRow
                key={issue?.id || issue?.key}
                t={t}
                issue={issue}
                activeLocale={activeLocale}
                usersById={usersById}
                sprintOptions={sortedSprints}
                onOpenIssueDetails={onOpenIssueDetails}
                onMoveIssue={onMoveIssue}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
