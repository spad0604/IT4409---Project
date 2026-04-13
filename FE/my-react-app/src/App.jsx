import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StatsOverview } from './shared/components/stats-overview/StatsOverview.jsx'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './features/auth/pages/Login'
import { useAuth } from './features/auth/model/AuthContext'

function Kanban() {
  const { t, i18n } = useTranslation()
  const { signOut } = useAuth()

  const activeLang = useMemo(() => {
    const current = i18n.resolvedLanguage || i18n.language || 'vi'
    return current.startsWith('vi') ? 'vi' : 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const topTabs = t('boardShell.topTabs', { returnObjects: true })
  const sideLinks = t('boardShell.sideLinks', { returnObjects: true })
  const cards = t('statsOverview.cards', { returnObjects: true })

  const recentProjects = [
    {
      id: 'mobile',
      title: 'Fintech Mobile App',
      summary: 'Revolutionizing digital banking for Gen Z users.',
      owners: ['AL', 'NT'],
      status: 'In Progress',
      progress: 68,
      tone: 'blue',
    },
    {
      id: 'rebrand',
      title: 'E-commerce Rebrand',
      summary: 'Visual identity and design system refresh.',
      owners: ['KH', 'LP'],
      status: 'Planning',
      progress: 34,
      tone: 'orange',
    },
    {
      id: 'api-docs',
      title: 'Internal API Docs',
      summary: 'Centralizing docs for developer onboarding.',
      owners: ['MN'],
      status: 'Review',
      progress: 82,
      tone: 'green',
    },
    {
      id: 'security',
      title: 'Security Audit v2',
      summary: 'Annual compliance and penetration testing.',
      owners: ['QV'],
      status: 'On Hold',
      progress: 47,
      tone: 'red',
    },
  ]

  const activityFeed = [
    {
      id: 'a1',
      actor: 'Sarah Chen',
      action: 'moved Landing Page Redesign to QA',
      time: '12 minutes ago',
      avatar: 'SC',
    },
    {
      id: 'a2',
      actor: 'Marcus Thorne',
      action: 'commented on Database Schema',
      time: '2 hours ago',
      avatar: 'MT',
    },
    {
      id: 'a3',
      actor: 'Alex Rivera',
      action: 'attached 4 files to Brand Assets',
      time: '5 hours ago',
      avatar: 'AR',
    },
  ]

  const assignedTasks = [
    {
      id: 't1',
      code: 'LED-102',
      title: 'Fix checkout button responsiveness',
      due: 'Due in 2 days',
      priority: 'High',
    },
    {
      id: 't2',
      code: 'LED-108',
      title: 'User interview synthesis for Q3',
      due: 'Today',
      priority: 'Medium',
    },
  ]

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
  }

  return (
    <main className="home-page">
      <section className="home-frame" data-enter>
        <header className="home-topbar">
          <div className="topbar-left">
            <p className="workspace-brand">{t('boardShell.workspaceName')}</p>
            <nav className="top-tabs" aria-label={t('boardShell.topNavLabel')}>
              {(Array.isArray(topTabs) ? topTabs : []).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`top-tab ${tab.id === 'dashboard' ? 'is-active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="topbar-right">
            <label className="issue-search" htmlFor="header-issue-search">
              <span aria-hidden="true">o</span>
              <input
                id="header-issue-search"
                type="search"
                placeholder={t('boardShell.searchPlaceholder')}
              />
            </label>
            <button type="button" className="create-issue-btn">
              {t('boardShell.createIssue')}
            </button>
            <button type="button" className="icon-btn" aria-label={t('boardShell.notifications')}>o</button>
            <button type="button" className="icon-btn" aria-label={t('boardShell.settings')}>o</button>
            <span className="profile-pill" aria-hidden="true">AN</span>
          </div>
        </header>

        <div className="home-body">
          <aside className="home-sidebar" aria-label={t('boardShell.sideNavLabel')}>
            <div className="team-summary">
              <span className="team-avatar">A</span>
              <div>
                <p className="team-name">{t('boardShell.teamName')}</p>
                <p className="team-type">{t('boardShell.teamType')}</p>
              </div>
            </div>

            <nav className="sidebar-links">
              {(Array.isArray(sideLinks) ? sideLinks : []).map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className={`sidebar-link ${link.id === 'overview' ? 'is-active' : ''}`}
                >
                  <span className="sidebar-icon" aria-hidden="true" />
                  {link.label}
                </button>
              ))}
            </nav>

            <button type="button" className="invite-member-btn">{t('boardShell.inviteMember')}</button>

            <div className="sidebar-footer">
              <button type="button" className="footer-link">{t('boardShell.help')}</button>
              <button type="button" className="footer-link">{t('boardShell.feedback')}</button>
              <button type="button" className="footer-link" onClick={signOut}>Sign out</button>
            </div>
          </aside>

          <section className="dashboard-main">
            <header className="dashboard-header">
              <div>
                <p className="dashboard-kicker">Workspace Dashboard</p>
                <h1>System Overview</h1>
              </div>

              <div className="dashboard-actions">
                <div className="mini-avatars" aria-hidden="true">
                  <span>SC</span>
                  <span>AR</span>
                  <span>MT</span>
                </div>
                <button type="button" className="filter-btn">Filter</button>
              </div>
            </header>

            <StatsOverview cards={cards} label={t('statsOverview.ariaLabel')} className="stats-overview-compact" />

            <section className="content-grid">
              <article className="recent-projects panel">
                <header className="panel-head">
                  <h2>Recent Projects</h2>
                  <button type="button" className="link-btn">View all</button>
                </header>

                <div className="project-grid">
                  {recentProjects.map((project) => (
                    <article key={project.id} className="project-card">
                      <p className="project-icon" aria-hidden="true">o</p>
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
                  ))}
                </div>
              </article>

              <aside className="activity-stream panel">
                <header className="panel-head">
                  <h2>Activity Stream</h2>
                </header>

                <div className="activity-list">
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

                <button type="button" className="history-btn">View Full History</button>
              </aside>
            </section>

            <section className="assigned panel">
              <header className="panel-head">
                <h2>Assigned to me</h2>
                <p>Sorted by: Priority</p>
              </header>

              <div className="assigned-list">
                {assignedTasks.map((task) => (
                  <article key={task.id} className="assigned-item">
                    <div>
                      <p className="task-code">{task.code}</p>
                      <h3>{task.title}</h3>
                      <p>{task.due} · {task.priority}</p>
                    </div>
                    <button type="button" className="open-btn">Open</button>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      </section>

      <div className="language-switch floating-lang" role="group" aria-label={t('nav.language')}>
        <button
          type="button"
          className={`lang-button ${activeLang === 'vi' ? 'is-active' : ''}`}
          onClick={() => handleLanguageChange('vi')}
        >
          VI
        </button>
        <button
          type="button"
          className={`lang-button ${activeLang === 'en' ? 'is-active' : ''}`}
          onClick={() => handleLanguageChange('en')}
        >
          EN
        </button>
      </div>
    </main>
  )

}


function RequireAuth({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }) {
  const { token } = useAuth()
  if (token) return <Navigate to="/home" replace />
  return children
}

function AppFallback() {
  const { token } = useAuth()
  return <Navigate to={token ? '/home' : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={(
            <PublicOnly>
              <Login />
            </PublicOnly>
          )}
        />

        <Route
          path="/home"
          element={(
            <RequireAuth>
              <Kanban />
            </RequireAuth>
          )}
        />

        <Route path="*" element={<AppFallback />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
