import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import UserAvatar from '../../../shared/components/UserAvatar'
import { StatsOverview } from '../../../shared/components/stats-overview/StatsOverview.jsx'
import { formatShortDate, priorityDisplay, safeLower } from '../kanbanUtils'
import { RecentProjects } from '../../../shared/components/recent-projects/RecentProjects.jsx'

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
  activeProjectDetail,
  onEditProject,
  onDeleteProject
}) {
  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">{t('overview.kicker')}</p>
          <h1>{activeProjectDetail?.name || t('overview.title')}</h1>
        </div>

        <div className="dashboard-actions">
          {activeProjectDetail && (
            <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
              <button
                type="button"
                className="icon-btn"
                onClick={onEditProject}
                title={t('common.edit', { defaultValue: 'Sửa dự án' })}
              >
                <FiEdit2 />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={onDeleteProject}
                title={t('common.delete', { defaultValue: 'Xóa dự án' })}
                style={{ color: '#d92d20' }}
              >
                <FiTrash2 />
              </button>
            </div>
          )}

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
        <RecentProjects
          t={t}
          recentProjects={recentProjects}
          onOpenCreateProject={onOpenCreateProject}
          onProjectSelect={onProjectSelect}
        />

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
                <UserAvatar className="activity-avatar" user={item.avatarUser} initials={item.avatar} />
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
                    {due ? `${t('common.due')}: ${due}` : t('common.noDueDate')} · {t(`priority.${safeLower(task?.priority) || pr.tone}`, { defaultValue: pr.label })}
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
