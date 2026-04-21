import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatsOverview } from './shared/components/stats-overview/StatsOverview.jsx'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './features/auth/pages/Login'
import { useAuth } from './features/auth/model/AuthContext'
import {
  FiArchive,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiFilter,
  FiGrid,
  FiHelpCircle,
  FiLayers,
  FiLayout,
  FiList,
  FiLogOut,
  FiMessageSquare,
  FiPlus,
  FiSearch,
  FiSettings,
  FiShield,
  FiTarget,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi'

const TOP_TAB_ICON_MAP = {
  dashboard: FiLayout,
  projects: FiLayers,
  backlog: FiList,
  team: FiUsers,
}

const SIDE_LINK_ICON_MAP = {
  overview: FiGrid,
  board: FiLayers,
  issues: FiFileText,
  reports: FiBarChart2,
  archive: FiArchive,
}

const PROJECT_ICON_MAP = {
  mobile: FiBriefcase,
  rebrand: FiLayers,
  'api-docs': FiBookOpen,
  security: FiShield,
}

const BOARD_STAGE_PROGRESS = {
  todo: 25,
  progress: 55,
  review: 80,
  done: 100,
}

const INITIAL_BOARD_COLUMNS = [
  {
    id: 'todo',
    title: 'To-do',
    tone: 'todo',
    items: [
      {
        id: 'card-101',
        code: 'CORE-101',
        title: 'Implement multi-factor authentication for admin accounts',
        label: 'feature',
        labelTone: 'blue',
        priority: 'High',
        due: 'Oct 24',
        assignee: 'AN',
      },
      {
        id: 'card-115',
        code: 'CORE-115',
        title: 'Update API documentation for v2 release',
        label: 'docs',
        labelTone: 'violet',
        priority: 'Low',
        due: 'Oct 28',
        assignee: 'MN',
      },
    ],
  },
  {
    id: 'progress',
    title: 'In Progress',
    tone: 'progress',
    items: [
      {
        id: 'card-89',
        code: 'CORE-89',
        title: 'Refactor dashboard layout to use bento-grid system',
        label: 'ui',
        labelTone: 'indigo',
        priority: 'Medium',
        due: 'Today',
        assignee: 'LH',
      },
    ],
  },
  {
    id: 'review',
    title: 'Code Review',
    tone: 'review',
    items: [
      {
        id: 'card-102',
        code: 'CORE-102',
        title: 'Optimize Postgres queries for historical data exports',
        label: 'backend',
        labelTone: 'amber',
        priority: 'High',
        due: 'Yesterday',
        assignee: 'QV',
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    tone: 'done',
    items: [
      {
        id: 'card-74',
        code: 'CORE-74',
        title: 'Establish dark mode color palette in Tailwind config',
        label: 'frontend',
        labelTone: 'green',
        priority: 'Medium',
        due: 'Oct 21',
        assignee: 'TK',
      },
    ],
  },
]

function cloneBoardColumns(columns) {
  return columns.map((column) => ({ ...column, items: column.items.map((item) => ({ ...item })) }))
}

function Kanban() {
  const { t, i18n } = useTranslation()
  const { signOut } = useAuth()
  const [activeTopTab, setActiveTopTab] = useState('dashboard')
  const [activeSideLink, setActiveSideLink] = useState('overview')
  const [boardColumns, setBoardColumns] = useState(() => cloneBoardColumns(INITIAL_BOARD_COLUMNS))
  const [dragState, setDragState] = useState(null)
  const [dropColumnID, setDropColumnID] = useState('')

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

  const boardTaskTotal = useMemo(
    () => boardColumns.reduce((sum, column) => sum + column.items.length, 0),
    [boardColumns],
  )

  const boardDoneCount = useMemo(
    () => boardColumns.find((column) => column.id === 'done')?.items.length ?? 0,
    [boardColumns],
  )

  const boardCompletion = boardTaskTotal > 0
    ? Math.round((boardDoneCount / boardTaskTotal) * 100)
    : 0

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
  }

  const handleTopTabClick = useCallback((tabID) => {
    setActiveTopTab(tabID)
    if (tabID === 'dashboard') setActiveSideLink('overview')
    if (tabID === 'projects') setActiveSideLink('board')
  }, [])

  const handleSideLinkClick = useCallback((linkID) => {
    setActiveSideLink(linkID)
    if (linkID === 'overview') setActiveTopTab('dashboard')
    if (linkID === 'board') setActiveTopTab('projects')
  }, [])

  const handleCardDragStart = useCallback((event, fromColumnID, cardID) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${fromColumnID}:${cardID}`)
    setDragState({ fromColumnID, cardID })
    setDropColumnID('')
  }, [])

  const handleColumnDragOver = useCallback((event, columnID) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropColumnID !== columnID) setDropColumnID(columnID)
  }, [dropColumnID])

  const handleColumnDrop = useCallback((event, toColumnID) => {
    event.preventDefault()
    if (!dragState || dragState.fromColumnID === toColumnID) {
      setDropColumnID('')
      return
    }

    setBoardColumns((prevColumns) => {
      let movedCard = null

      const withoutCard = prevColumns.map((column) => {
        if (column.id !== dragState.fromColumnID) return { ...column, items: [...column.items] }

        const itemIndex = column.items.findIndex((item) => item.id === dragState.cardID)
        if (itemIndex < 0) return { ...column, items: [...column.items] }

        movedCard = column.items[itemIndex]
        const nextItems = [...column.items]
        nextItems.splice(itemIndex, 1)

        return { ...column, items: nextItems }
      })

      if (!movedCard) return prevColumns

      return withoutCard.map((column) => (
        column.id === toColumnID
          ? { ...column, items: [movedCard, ...column.items] }
          : column
      ))
    })

    setDropColumnID('')
    setDragState(null)
  }, [dragState])

  const handleCardDragEnd = useCallback(() => {
    setDropColumnID('')
    setDragState(null)
  }, [])

  const isBoardView = activeSideLink === 'board'
  const isPlaceholderView = !isBoardView && activeSideLink !== 'overview'

  return (
    <main className="home-page">
      <section className="home-frame" data-enter>
        <header className="home-topbar">
          <div className="topbar-left">
            <p className="workspace-brand">{t('boardShell.workspaceName')}</p>
            <nav className="top-tabs" aria-label={t('boardShell.topNavLabel')}>
              {(Array.isArray(topTabs) ? topTabs : []).map((tab) => {
                const TabIcon = TOP_TAB_ICON_MAP[tab.id] || FiGrid

                return (
                <button
                  key={tab.id}
                  type="button"
                  className={`top-tab ${tab.id === activeTopTab ? 'is-active' : ''}`}
                  onClick={() => handleTopTabClick(tab.id)}
                >
                  <span className="tab-icon" aria-hidden="true"><TabIcon /></span>
                  {tab.label}
                </button>
                )
              })}
            </nav>
          </div>

          <div className="topbar-right">
            <label className="issue-search" htmlFor="header-issue-search">
              <FiSearch className="issue-search-icon" aria-hidden="true" />
              <input
                id="header-issue-search"
                type="search"
                placeholder={t('boardShell.searchPlaceholder')}
              />
            </label>
            <button type="button" className="create-issue-btn">
              {t('boardShell.createIssue')}
            </button>
            <button type="button" className="icon-btn" aria-label={t('boardShell.notifications')}><FiBell /></button>
            <button type="button" className="icon-btn" aria-label={t('boardShell.settings')}><FiSettings /></button>
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
              {(Array.isArray(sideLinks) ? sideLinks : []).map((link) => {
                const LinkIcon = SIDE_LINK_ICON_MAP[link.id] || FiGrid

                return (
                <button
                  key={link.id}
                  type="button"
                  className={`sidebar-link ${link.id === activeSideLink ? 'is-active' : ''}`}
                  onClick={() => handleSideLinkClick(link.id)}
                >
                  <span className="sidebar-icon" aria-hidden="true"><LinkIcon /></span>
                  {link.label}
                </button>
                )
              })}
            </nav>

            <button type="button" className="invite-member-btn"><FiUserPlus /> {t('boardShell.inviteMember')}</button>

            <div className="sidebar-footer">
              <button type="button" className="footer-link"><FiHelpCircle /> {t('boardShell.help')}</button>
              <button type="button" className="footer-link"><FiMessageSquare /> {t('boardShell.feedback')}</button>
              <button type="button" className="footer-link" onClick={signOut}><FiLogOut /> Sign out</button>
            </div>
          </aside>

          <section className="dashboard-main">
            {!isBoardView && !isPlaceholderView ? (
              <>
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
                    <button type="button" className="filter-btn"><FiFilter /> Filter</button>
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
                      {recentProjects.map((project) => {
                        const ProjectIcon = PROJECT_ICON_MAP[project.id] || FiBriefcase

                        return (
                          <article key={project.id} className="project-card">
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
              </>
            ) : null}

            {isBoardView ? (
              <section className="board-shell" aria-label="Draggable board">
                <header className="dashboard-header board-header">
                  <div>
                    <p className="dashboard-kicker">{t('boardShell.contentTitle')}</p>
                    <h1>Engineering Sprint #42</h1>
                    <p className="board-subtitle">{t('boardShell.contentSubtitle')}</p>
                  </div>

                  <div className="dashboard-actions board-actions">
                    <div className="mini-avatars" aria-hidden="true">
                      <span>AN</span>
                      <span>AR</span>
                      <span>MT</span>
                    </div>
                    <button type="button" className="filter-btn"><FiFilter /> Filters</button>
                  </div>
                </header>

                <section className="board-flow panel">
                  <div className="flow-header">
                    <h2>Flow Progress</h2>
                    <p>{boardDoneCount}/{boardTaskTotal} completed</p>
                  </div>

                  <div className="flow-track" aria-hidden="true">
                    {boardColumns.map((column, index) => (
                      <div key={column.id} className="flow-step-wrap">
                        <div className={`flow-step is-${column.tone}`}>
                          <span>{column.title}</span>
                          <strong>{column.items.length}</strong>
                        </div>
                        {index < boardColumns.length - 1 ? <FiChevronRight className="flow-arrow" /> : null}
                      </div>
                    ))}
                  </div>

                  <div className="board-progress">
                    <div className="board-progress-track" aria-hidden="true">
                      <span style={{ width: `${boardCompletion}%` }} />
                    </div>
                    <span>{boardCompletion}% sprint flow completion</span>
                  </div>
                </section>

                <section className="board-columns" aria-label="Kanban lanes">
                  {boardColumns.map((column) => (
                    <article
                      key={column.id}
                      className={`board-column is-${column.tone} ${dropColumnID === column.id ? 'is-drop-target' : ''}`}
                      onDragOver={(event) => handleColumnDragOver(event, column.id)}
                      onDrop={(event) => handleColumnDrop(event, column.id)}
                    >
                      <header className="board-column-head">
                        <div>
                          <h3>{column.title}</h3>
                          <p>{column.items.length} cards</p>
                        </div>
                        <button type="button" className="lane-add-btn" aria-label={`Add card to ${column.title}`}>
                          <FiPlus />
                        </button>
                      </header>

                      <div className="board-card-list">
                        {column.items.map((item) => (
                          <article
                            key={item.id}
                            className={`board-card ${dragState?.cardID === item.id ? 'is-dragging' : ''}`}
                            draggable
                            onDragStart={(event) => handleCardDragStart(event, column.id, item.id)}
                            onDragEnd={handleCardDragEnd}
                          >
                            <p className="board-card-code">{item.code}</p>
                            <h4>{item.title}</h4>

                            <div className="board-card-tags">
                              <span className={`task-tag tone-${item.labelTone}`}>{item.label}</span>
                              <span className={`task-priority tone-${item.priority.toLowerCase()}`}>{item.priority}</span>
                            </div>

                            <div className="board-progress-track compact" aria-hidden="true">
                              <span style={{ width: `${BOARD_STAGE_PROGRESS[column.id]}%` }} />
                            </div>

                            <footer className="board-card-foot">
                              <span><FiClock /> {item.due}</span>
                              <span className="assignee-pill">{item.assignee}</span>
                            </footer>
                          </article>
                        ))}
                      </div>
                    </article>
                  ))}
                </section>

                <button type="button" className="quick-action-btn"><FiTarget /> {t('boardShell.quickActions')}</button>
              </section>
            ) : null}

            {isPlaceholderView ? (
              <section className="placeholder-panel panel">
                <h2>{activeSideLink.toUpperCase()}</h2>
                <p>{t('boardShell.pagePlaceholder')}</p>
                <button type="button" className="open-btn" onClick={() => handleSideLinkClick('overview')}>
                  Back to Overview
                </button>
              </section>
            ) : null}
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
