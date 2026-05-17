import { FiBriefcase } from 'react-icons/fi'
import { StatsOverview } from '../../../shared/components/stats-overview/StatsOverview.jsx'
import { formatShortDate, priorityDisplay } from '../kanbanUtils'

export default function OverviewPanel({
  t,
  recentProjects,
  activityFeed,
  assignedIssues,
  statsCards,
  activeLocale,
  projectsLoading,
  projectsError,
  issuesLoading,
  issuesError,
  onOpenCreateProject,
  onProjectSelect,
  onOpenIssueDetails,
}) {
  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">{t('overview.kicker')}</p>
          <h1>{t('overview.title')}</h1>
        </div>

        <div className="dashboard-actions">
          <div className="mini-avatars" aria-hidden="true">
            <span>SC</span>
            <span>AR</span>
            <span>MT</span>
          </div>
          <button type="button" className="filter-btn">{t('common.filter')}</button>
        </div>
      </header>

      <StatsOverview cards={statsCards} label={t('statsOverview.ariaLabel')} className="stats-overview-compact" />

      {projectsLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
      {projectsError ? <p className="dashboard-kicker">{projectsError}</p> : null}
      {issuesLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
      {issuesError ? <p className="dashboard-kicker">{issuesError}</p> : null}

      <section className="content-grid">
        <article className="recent-projects panel">
          <header className="panel-head">
            <h2>{t('overview.recentProjects')}</h2>
            <div className="panel-head-actions">
              <button type="button" className="link-btn">{t('common.viewAll')}</button>
              <button type="button" className="filter-btn" onClick={onOpenCreateProject}>
                {t('projects.create.open')}
              </button>
            </div>
          </header>

          <div className="project-grid">
            {recentProjects.map((project) => {
              const ProjectIcon = FiBriefcase

              return (
                <article
                  key={project.id}
                  className="project-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onProjectSelect(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onProjectSelect(project.id)
                  }}
                >
                  <p className={`project-icon tone-${project.tone}`} aria-hidden="true"><ProjectIcon /></p>
                  <h3>{project.title}</h3>
                  <p>{project.summary}</p>
                  <div className="project-meta">
                    <div className="mini-avatars small" aria-hidden="true">
                      {project.owners.map((owner) => (
                        <span key={owner}>{owner}</span>
                      ))}
                    </div>
                    <span className={`status-chip tone-${project.tone}`}>{project.status}</span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <span style={{ width: `${project.progress}%` }} />
                  </div>
                </article>
              )
            })}
          </div>
        </article>

        <aside className="activity-stream panel">
          <header className="panel-head">
            <h2>{t('overview.activity.title')}</h2>
          </header>

          <div className="activity-list">
            {activityFeed.length === 0 ? (
              <article className="activity-item">
                <p style={{ margin: 0, color: '#667085', fontSize: '0.62rem' }}>
                  {t('overview.activity.empty')}
                </p>
              </article>
            ) : null}
            {activityFeed.map((item) => (
              <article key={item.id} className="activity-item">
                <span className="activity-avatar">{item.avatar}</span>
                <div>
                  <p>
                    <strong>{item.actor}</strong> {item.action}
                  </p>
                  <span>{item.time}</span>
                </div>
              </article>
            ))}
          </div>

          <button type="button" className="history-btn">{t('overview.activity.viewFullHistory')}</button>
        </aside>
      </section>

      <section className="assigned panel">
        <header className="panel-head">
          <h2>{t('overview.assigned.title')}</h2>
          <p>{t('overview.assigned.sortedBy')}</p>
        </header>

        <div className="assigned-list">
          {assignedIssues.length === 0 ? (
            <article className="assigned-item">
              <div>
                <h3>{t('overview.assigned.empty')}</h3>
                <p>{t('overview.assigned.emptyHint')}</p>
              </div>
            </article>
          ) : null}

          {assignedIssues.map((task) => {
            const pr = priorityDisplay(task?.priority)
            const due = formatShortDate(task?.dueDate, activeLocale)
            return (
              <article key={task?.key} className="assigned-item">
                <div>
                  <p className="task-code">{task?.key}</p>
                  <h3>{task?.title}</h3>
                  <p>
                    {due ? `${t('common.due')}: ${due}` : t('common.noDueDate')} · {t(`priority.${pr.tone}`, { defaultValue: pr.label })}
                  </p>
                </div>
                <button type="button" className="open-btn" onClick={() => onOpenIssueDetails(task?.key)}>
                  {t('common.open')}
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
