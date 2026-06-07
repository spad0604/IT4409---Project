import { FiBriefcase } from 'react-icons/fi'

export function RecentProjects({
    t,
    recentProjects,
    onOpenCreateProject,
    onProjectSelect,
}) {
    return (
        <article className="recent-projects panel">
            <header className="panel-head">
                <h2>{t('overview.recentProjects')}</h2>

                <div className="panel-head-actions">
                    <button type="button" className="link-btn">
                        {t('common.viewAll')}
                    </button>

                    <button
                        type="button"
                        className="filter-btn"
                        onClick={onOpenCreateProject}
                    >
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
                                if (e.key === 'Enter' || e.key === ' ') {
                                    onProjectSelect(project.id)
                                }
                            }}
                        >
                            <p
                                className={`project-icon tone-${project.tone}`}
                                aria-hidden="true"
                            >
                                <ProjectIcon />
                            </p>

                            <h3>{project.title}</h3>

                            <p>{project.summary}</p>

                            <div className="project-meta">
                                <div className="mini-avatars small" aria-hidden="true">
                                    {project.owners.map((owner) => (
                                        <span key={owner}>{owner}</span>
                                    ))}
                                </div>

                                <span className={`status-chip tone-${project.tone}`}>
                                    {project.status}
                                </span>
                            </div>

                            <div className="progress-track" aria-hidden="true">
                                <span style={{ width: `${project.progress}%` }} />
                            </div>
                        </article>
                    )
                })}
            </div>
        </article>
    )
}