import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatsOverview } from './shared/components/stats-overview/StatsOverview.jsx'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './features/auth/pages/Login'
import { useAuth } from './features/auth/model/AuthContext'
import * as projectApi from './features/projects/api/projectApi'
import * as boardApi from './features/boards/api/boardApi'
import * as issueApi from './features/issues/api/issueApi'
import * as userApi from './features/users/api/userApi'
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

const ACTIVE_PROJECT_KEY = 'it4409_active_project_id'

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

const BOARD_STAGE_PROGRESS = {
  todo: 25,
  in_progress: 55,
  in_review: 80,
  done: 100,
}

function safeLower(value) {
  return String(value ?? '').trim().toLowerCase()
}

function toInitials(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return ''
  const parts = raw.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] ?? ''
  return `${first}${last}`.toUpperCase()
}

function toneFromIndex(index) {
  const tones = ['blue', 'orange', 'green', 'red']
  return tones[Math.abs(index) % tones.length]
}

function labelToneFromIssueType(type) {
  switch (safeLower(type)) {
    case 'bug':
      return 'amber'
    case 'task':
      return 'indigo'
    case 'story':
      return 'blue'
    case 'epic':
      return 'violet'
    case 'subtask':
      return 'green'
    default:
      return 'blue'
  }
}

function priorityDisplay(priority) {
  const p = safeLower(priority)
  if (p === 'critical' || p === 'high') return { label: 'High', tone: 'high' }
  if (p === 'medium') return { label: 'Medium', tone: 'medium' }
  return { label: 'Low', tone: 'low' }
}

function formatShortDate(value, locale) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit' }).format(date)
  } catch {
    return date.toLocaleDateString()
  }
}

function Kanban() {
  const { t, i18n } = useTranslation()
  const { user, refreshMe, serverSignOut } = useAuth()
  const [activeTopTab, setActiveTopTab] = useState('dashboard')
  const [activeSideLink, setActiveSideLink] = useState('overview')
  const [dragState, setDragState] = useState(null)
  const [dropColumnID, setDropColumnID] = useState('')

  const [headerSearch, setHeaderSearch] = useState('')

  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')

  const [showCreateProject, setShowCreateProject] = useState(false)
  const [createProjectLoading, setCreateProjectLoading] = useState(false)
  const [createProjectError, setCreateProjectError] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectKey, setNewProjectKey] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectType, setNewProjectType] = useState('kanban')

  const [activeProjectId, setActiveProjectId] = useState('')
  const [activeBoardId, setActiveBoardId] = useState('')
  const [boardDetail, setBoardDetail] = useState(null)
  const [boardColumnsMeta, setBoardColumnsMeta] = useState([])

  const [issuesData, setIssuesData] = useState({ items: [], total: 0, page: 0, perPage: 20 })
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [issuesError, setIssuesError] = useState('')

  const [assignedIssues, setAssignedIssues] = useState([])

  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')

  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteResults, setInviteResults] = useState([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const [showCreateIssue, setShowCreateIssue] = useState(false)
  const [createIssueLoading, setCreateIssueLoading] = useState(false)
  const [createIssueError, setCreateIssueError] = useState('')
  const [newIssueProjectId, setNewIssueProjectId] = useState('')
  const [newIssueType, setNewIssueType] = useState('task')
  const [newIssuePriority, setNewIssuePriority] = useState('medium')
  const [newIssueTitle, setNewIssueTitle] = useState('')
  const [newIssueDescription, setNewIssueDescription] = useState('')

  const [usersById, setUsersById] = useState({})
  const userFetchInFlight = useRef(new Map())

  const activeLang = useMemo(() => {
    const current = i18n.resolvedLanguage || i18n.language || 'vi'
    return current.startsWith('vi') ? 'vi' : 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const topTabs = t('boardShell.topTabs', { returnObjects: true })
  const sideLinks = t('boardShell.sideLinks', { returnObjects: true })

  const activityFeed = t('overview.activity.items', { returnObjects: true })

  const activeLocale = useMemo(() => (activeLang === 'vi' ? 'vi-VN' : 'en-US'), [activeLang])

  const activeProject = useMemo(
    () => projects.find((p) => String(p?.id) === String(activeProjectId)) ?? null,
    [projects, activeProjectId],
  )

  const profileInitials = useMemo(() => toInitials(user?.name || user?.email || ''), [user])

  const issueItems = useMemo(
    () => (Array.isArray(issuesData?.items) ? issuesData.items : []),
    [issuesData?.items],
  )

  const boardTaskTotal = useMemo(() => issueItems.length, [issueItems])
  const boardDoneCount = useMemo(
    () => issueItems.filter((i) => safeLower(i?.status) === 'done').length,
    [issueItems],
  )

  const boardCompletion = boardTaskTotal > 0
    ? Math.round((boardDoneCount / boardTaskTotal) * 100)
    : 0

  const overdueCount = useMemo(() => {
    const now = Date.now()
    return issueItems.filter((i) => {
      const status = safeLower(i?.status)
      if (status === 'done' || status === 'cancelled') return false
      if (!i?.dueDate) return false
      const due = new Date(i.dueDate).getTime()
      return !Number.isNaN(due) && due < now
    }).length
  }, [issueItems])

  const statsCards = useMemo(() => {
    const baseCards = t('statsOverview.cards', { returnObjects: true })
    const list = Array.isArray(baseCards) ? baseCards : []
    return list.map((card) => {
      if (card?.id === 'totalTasks') return { ...card, value: String(issuesData?.total ?? issueItems.length) }
      if (card?.id === 'overdue') return { ...card, value: String(overdueCount) }
      if (card?.id === 'completed') return { ...card, value: String(boardDoneCount) }
      if (card?.id === 'activeProjects') return { ...card, value: String(projects.length) }
      return card
    })
  }, [t, issuesData?.total, issueItems.length, overdueCount, boardDoneCount, projects.length])

  const kanbanColumns = useMemo(() => {
    const columns = Array.isArray(boardColumnsMeta) && boardColumnsMeta.length > 0
      ? [...boardColumnsMeta].sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))
      : [
        { id: 'todo', statusMap: 'todo', name: t('board.columns.todo'), position: 1 },
        { id: 'in_progress', statusMap: 'in_progress', name: t('board.columns.in_progress'), position: 2 },
        { id: 'in_review', statusMap: 'in_review', name: t('board.columns.in_review'), position: 3 },
        { id: 'done', statusMap: 'done', name: t('board.columns.done'), position: 4 },
      ]

    const byStatus = new Map()
    for (const issue of issueItems) {
      const status = safeLower(issue?.status)
      if (!status) continue
      if (!byStatus.has(status)) byStatus.set(status, [])
      byStatus.get(status).push(issue)
    }

    return columns.map((col) => {
      const statusMap = safeLower(col?.statusMap || col?.id)
      const items = byStatus.get(statusMap) ?? []
      const title = t(`board.columns.${statusMap}`, { defaultValue: col?.name || statusMap })
      const tone = statusMap
      return {
        id: statusMap,
        title,
        tone,
        items,
      }
    })
  }, [boardColumnsMeta, issueItems, t])

  const ensureUsersLoaded = useCallback(async (ids) => {
    const unique = Array.from(new Set((ids ?? []).filter(Boolean).map(String)))
    const missing = unique.filter((id) => !usersById[id])
    if (missing.length === 0) return

    await Promise.all(missing.map(async (id) => {
      if (userFetchInFlight.current.has(id)) return userFetchInFlight.current.get(id)

      const p = userApi.getUser(id)
        .then((data) => {
          setUsersById((prev) => ({ ...prev, [id]: data }))
        })
        .catch(() => {
          // ignore missing user details
        })
        .finally(() => {
          userFetchInFlight.current.delete(id)
        })

      userFetchInFlight.current.set(id, p)
      return p
    }))
  }, [usersById])

  const refetchIssues = useCallback(async (projectId, { search } = {}) => {
    if (!projectId) return
    setIssuesLoading(true)
    setIssuesError('')
    try {
      const data = await issueApi.listIssues(projectId, {
        page: 0,
        per_page: 50,
        search: search ? String(search) : '',
      })
      const items = Array.isArray(data?.items) ? data.items : []
      setIssuesData({
        items,
        total: Number(data?.total ?? items.length),
        page: Number(data?.page ?? 0),
        perPage: Number(data?.perPage ?? 50),
      })

      const userIds = [
        ...items.map((i) => i?.assigneeId).filter(Boolean),
        ...items.map((i) => i?.reporterId).filter(Boolean),
      ]
      await ensureUsersLoaded(userIds)
    } catch (err) {
      setIssuesError(err?.message || t('common.loadError'))
      setIssuesData({ items: [], total: 0, page: 0, perPage: 50 })
    } finally {
      setIssuesLoading(false)
    }
  }, [ensureUsersLoaded, t])

  const refetchAssigned = useCallback(async (projectId) => {
    if (!projectId) return
    try {
      const data = await issueApi.listIssues(projectId, { assignee: 'me', per_page: 10 })
      const items = Array.isArray(data?.items) ? data.items : []
      setAssignedIssues(items.slice(0, 2))
      await ensureUsersLoaded(items.map((i) => i?.assigneeId).filter(Boolean))
    } catch {
      setAssignedIssues([])
    }
  }, [ensureUsersLoaded])

  const refetchBoards = useCallback(async (projectId) => {
    if (!projectId) return
    try {
      const data = await boardApi.listBoards(projectId)
      const list = Array.isArray(data) ? data : []
      const preferred = list.find((b) => b?.isDefault) ?? list[0] ?? null
      setActiveBoardId(preferred?.id ?? '')
    } catch {
      setActiveBoardId('')
    }
  }, [])

  const refetchBoardDetail = useCallback(async (boardId) => {
    if (!boardId) {
      setBoardDetail(null)
      setBoardColumnsMeta([])
      return
    }
    try {
      const data = await boardApi.getBoard(boardId)
      setBoardDetail(data?.board ?? null)
      setBoardColumnsMeta(Array.isArray(data?.columns) ? data.columns : [])
    } catch {
      setBoardDetail(null)
      setBoardColumnsMeta([])
    }
  }, [])

  const refetchMembers = useCallback(async (projectId) => {
    if (!projectId) return
    setMembersLoading(true)
    setMembersError('')
    try {
      const data = await projectApi.getProjectMembers(projectId)
      const list = Array.isArray(data) ? data : []
      setMembers(list)
      await ensureUsersLoaded(list.map((m) => m?.userId).filter(Boolean))
    } catch (err) {
      setMembersError(err?.message || t('common.loadError'))
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [ensureUsersLoaded, t])

  const refetchProjects = useCallback(async () => {
    setProjectsLoading(true)
    setProjectsError('')
    try {
      const data = await projectApi.listProjects()
      const list = Array.isArray(data) ? data : []
      setProjects(list)

      let nextActive = ''
      try {
        nextActive = window.localStorage.getItem(ACTIVE_PROJECT_KEY) || ''
      } catch {
        nextActive = ''
      }

      const exists = list.some((p) => String(p?.id) === String(nextActive))
      if (!exists) nextActive = list[0]?.id ?? ''
      setActiveProjectId(nextActive)
    } catch (err) {
      setProjects([])
      setActiveProjectId('')
      setProjectsError(err?.message || t('common.loadError'))
    } finally {
      setProjectsLoading(false)
    }
  }, [t])

  useEffect(() => {
    refreshMe().catch(() => {})
  }, [refreshMe])

  useEffect(() => {
    refetchProjects()
  }, [refetchProjects])

  useEffect(() => {
    if (!activeProjectId) return
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, String(activeProjectId))
    } catch {
      // ignore
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!activeProjectId) return
    refetchBoards(activeProjectId)
    refetchIssues(activeProjectId, { search: headerSearch })
  }, [activeProjectId, headerSearch, refetchBoards, refetchIssues])

  useEffect(() => {
    refetchBoardDetail(activeBoardId)
  }, [activeBoardId, refetchBoardDetail])

  useEffect(() => {
    const isTeamView = activeTopTab === 'team'
    if (!isTeamView) return
    refetchMembers(activeProjectId)
  }, [activeProjectId, activeTopTab, refetchMembers])

  useEffect(() => {
    const isOverview = activeTopTab === 'dashboard'
    if (!isOverview) return
    refetchAssigned(activeProjectId)
  }, [activeProjectId, activeTopTab, refetchAssigned])

  useEffect(() => {
    const keyword = String(inviteSearch ?? '').trim()
    if (activeTopTab !== 'team') return
    if (!keyword) {
      setInviteResults([])
      setInviteError('')
      return
    }

    const handle = window.setTimeout(() => {
      setInviteLoading(true)
      setInviteError('')
      userApi.searchUsers({ search: keyword, perPage: 10 })
        .then((data) => {
          setInviteResults(Array.isArray(data) ? data : [])
        })
        .catch((err) => {
          setInviteResults([])
          setInviteError(err?.message || t('common.loadError'))
        })
        .finally(() => setInviteLoading(false))
    }, 250)

    return () => window.clearTimeout(handle)
  }, [inviteSearch, activeTopTab, t])

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
  }

  const handleTopTabClick = useCallback((tabID) => {
    setActiveTopTab(tabID)
    if (tabID === 'dashboard') setActiveSideLink('overview')
    if (tabID === 'projects') setActiveSideLink('board')
    if (tabID === 'backlog') setActiveSideLink('issues')
    if (tabID === 'team') setActiveSideLink('issues')
  }, [])

  const handleSideLinkClick = useCallback((linkID) => {
    setActiveSideLink(linkID)
    if (linkID === 'overview') setActiveTopTab('dashboard')
    if (linkID === 'board') setActiveTopTab('projects')
    if (linkID === 'issues') setActiveTopTab('backlog')
  }, [])

  const resetCreateIssueForm = useCallback(() => {
    setNewIssueType('task')
    setNewIssuePriority('medium')
    setNewIssueTitle('')
    setNewIssueDescription('')
    setCreateIssueError('')
  }, [])

  const handleOpenCreateIssue = useCallback(() => {
    setShowCreateIssue(true)
    setCreateIssueError('')
    setNewIssueProjectId(String(activeProjectId || projects?.[0]?.id || ''))
  }, [activeProjectId, projects])

  const handleCancelCreateIssue = useCallback(() => {
    setShowCreateIssue(false)
    resetCreateIssueForm()
  }, [resetCreateIssueForm])

  const handleSubmitCreateIssue = useCallback(async (event) => {
    event.preventDefault()

    const projectId = String(newIssueProjectId || activeProjectId || '').trim()
    const title = String(newIssueTitle ?? '').trim()
    const description = String(newIssueDescription ?? '').trim()
    const type = String(newIssueType ?? 'task').trim() || 'task'
    const priority = String(newIssuePriority ?? 'medium').trim() || 'medium'

    if (!projectId) {
      setCreateIssueError(t('issues.create.validationProject'))
      return
    }
    if (!title) {
      setCreateIssueError(t('issues.create.validationTitle'))
      return
    }

    setCreateIssueLoading(true)
    setCreateIssueError('')
    try {
      await issueApi.createIssue(projectId, {
        title,
        type,
        priority,
        description,
      })

      setActiveProjectId(projectId)
      await refetchIssues(projectId, { search: headerSearch })
      await refetchAssigned(projectId)

      setShowCreateIssue(false)
      resetCreateIssueForm()
    } catch (err) {
      setCreateIssueError(err?.message || t('common.actionFailed'))
    } finally {
      setCreateIssueLoading(false)
    }
  }, [activeProjectId, headerSearch, newIssueDescription, newIssuePriority, newIssueProjectId, newIssueTitle, newIssueType, refetchAssigned, refetchIssues, resetCreateIssueForm, t])

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

            {showCreateIssue ? (
              <div className="modal-overlay" role="presentation" onMouseDown={handleCancelCreateIssue}>
                <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
                  <header className="modal-head">
                    <div>
                      <h2>{t('issues.create.title')}</h2>
                      <p>{t('issues.create.subtitle')}</p>
                    </div>
                    <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={handleCancelCreateIssue}>
                      <FiX />
                    </button>
                  </header>

                  <form className="modal-body" onSubmit={handleSubmitCreateIssue}>
                    <div className="modal-grid">
                      <label className="inline-field" htmlFor="new-issue-project">
                        <span className="inline-label">{t('issues.create.project')}</span>
                        <select
                          id="new-issue-project"
                          className="inline-select"
                          value={newIssueProjectId}
                          onChange={(e) => setNewIssueProjectId(e.target.value)}
                        >
                          {(Array.isArray(projects) ? projects : []).map((p) => (
                            <option key={p?.id} value={p?.id}>{p?.name || t('projects.untitled')}</option>
                          ))}
                        </select>
                      </label>

                      <label className="inline-field" htmlFor="new-issue-type">
                        <span className="inline-label">{t('issues.create.type')}</span>
                        <select
                          id="new-issue-type"
                          className="inline-select"
                          value={newIssueType}
                          onChange={(e) => setNewIssueType(e.target.value)}
                        >
                          <option value="task">{t('issue.type.task')}</option>
                          <option value="bug">{t('issue.type.bug')}</option>
                          <option value="story">{t('issue.type.story')}</option>
                          <option value="epic">{t('issue.type.epic')}</option>
                          <option value="subtask">{t('issue.type.subtask')}</option>
                        </select>
                      </label>

                      <div className="inline-field">
                        <span className="inline-label">{t('issues.create.priority')}</span>
                        <div className="priority-stack">
                          {['high', 'medium', 'low'].map((p) => (
                            <button
                              key={p}
                              type="button"
                              className={`priority-pill ${newIssuePriority === p ? 'is-active' : ''}`}
                              onClick={() => setNewIssuePriority(p)}
                            >
                              {t(`priority.${p}`)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="inline-field modal-span" htmlFor="new-issue-title">
                        <span className="inline-label">{t('issues.create.summary')}</span>
                        <input
                          id="new-issue-title"
                          className="inline-input"
                          value={newIssueTitle}
                          onChange={(e) => setNewIssueTitle(e.target.value)}
                          placeholder={t('issues.create.summaryPlaceholder')}
                          autoComplete="off"
                        />
                      </label>

                      <label className="inline-field modal-span" htmlFor="new-issue-description">
                        <span className="inline-label">{t('issues.create.description')}</span>
                        <textarea
                          id="new-issue-description"
                          className="modal-textarea"
                          value={newIssueDescription}
                          onChange={(e) => setNewIssueDescription(e.target.value)}
                          placeholder={t('issues.create.descriptionPlaceholder')}
                          rows={6}
                        />
                      </label>
                    </div>

                    {createIssueError ? <p className="inline-error">{createIssueError}</p> : null}

                    <footer className="modal-actions">
                      <button type="button" className="filter-btn" onClick={handleCancelCreateIssue}>
                        {t('common.cancel')}
                      </button>
                      <button type="submit" className="create-issue-btn" disabled={createIssueLoading}>
                        {createIssueLoading ? t('issues.create.creating') : t('issues.create.submit')}
                      </button>
                    </footer>
                  </form>
                </div>
              </div>
            ) : null}

    const issueKey = dragState.cardID
    const fromStatus = dragState.fromColumnID
    const toStatus = toColumnID

    setIssuesData((prev) => {
      const items = Array.isArray(prev?.items) ? prev.items : []
      const nextItems = items.map((it) => (
        String(it?.key) === String(issueKey)
          ? { ...it, status: toStatus }
          : it
      ))
      return { ...prev, items: nextItems }
    })

    issueApi.changeIssueStatus(issueKey, toStatus)
      .catch(() => {
        setIssuesData((prev) => {
          const items = Array.isArray(prev?.items) ? prev.items : []
          const nextItems = items.map((it) => (
            String(it?.key) === String(issueKey)
              ? { ...it, status: fromStatus }
              : it
          ))
          return { ...prev, items: nextItems }
        })
      })

    setDropColumnID('')
    setDragState(null)
  }, [dragState])

  const handleCardDragEnd = useCallback(() => {
    setDropColumnID('')
    setDragState(null)
  }, [])

  const isBoardView = activeTopTab === 'projects'
  const isOverviewView = activeTopTab === 'dashboard'
  const isBacklogView = activeTopTab === 'backlog'
  const isTeamView = activeTopTab === 'team'

  const isPlaceholderView = !(isBoardView || isOverviewView || isBacklogView || isTeamView)

  const recentProjects = useMemo(() => {
    return (Array.isArray(projects) ? projects : []).slice(0, 4).map((p, index) => {
      const owners = [profileInitials || '']
      const tone = toneFromIndex(index)
      return {
        id: p?.id,
        title: p?.name || t('projects.untitled'),
        summary: p?.description || t('projects.noDescription'),
        owners: owners.filter(Boolean),
        status: p?.type ? String(p.type).toUpperCase() : t('projects.status.active'),
        progress: boardCompletion,
        tone,
      }
    })
  }, [projects, profileInitials, t, boardCompletion])

  const backlogItems = useMemo(() => {
    const items = issueItems
    const order = { critical: 0, high: 1, medium: 2, low: 3, trivial: 4 }
    return [...items].sort((a, b) => {
      const pa = order[safeLower(a?.priority)] ?? 99
      const pb = order[safeLower(b?.priority)] ?? 99
      if (pa !== pb) return pa - pb
      return safeLower(a?.key).localeCompare(safeLower(b?.key))
    })
  }, [issueItems])

  const handleProjectSelect = useCallback((projectId) => {
    setActiveProjectId(String(projectId ?? ''))
  }, [])

  const resetCreateProjectForm = useCallback(() => {
    setNewProjectName('')
    setNewProjectKey('')
    setNewProjectDescription('')
    setNewProjectType('kanban')
    setCreateProjectError('')
  }, [])

  const handleOpenCreateProject = useCallback(() => {
    setShowCreateProject(true)
    setCreateProjectError('')
  }, [])

  const handleCancelCreateProject = useCallback(() => {
    setShowCreateProject(false)
    resetCreateProjectForm()
  }, [resetCreateProjectForm])

  const normalizeProjectKey = useCallback((value) => {
    return String(value ?? '')
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase()
  }, [])

  const handleSubmitCreateProject = useCallback(async (event) => {
    event.preventDefault()

    const name = String(newProjectName ?? '').trim()
    const key = normalizeProjectKey(newProjectKey)
    const description = String(newProjectDescription ?? '').trim()
    const type = String(newProjectType ?? 'kanban').trim() || 'kanban'

    if (!name || !key) {
      setCreateProjectError(t('projects.create.validation'))
      return
    }

    setCreateProjectLoading(true)
    setCreateProjectError('')
    try {
      const created = await projectApi.createProject({ name, key, description, type })
      await refetchProjects()

      if (created?.id) {
        setActiveProjectId(String(created.id))
      }

      setShowCreateProject(false)
      resetCreateProjectForm()
    } catch (err) {
      setCreateProjectError(err?.message || t('common.actionFailed'))
    } finally {
      setCreateProjectLoading(false)
    }
  }, [newProjectName, newProjectKey, newProjectDescription, newProjectType, normalizeProjectKey, refetchProjects, resetCreateProjectForm, t])

  const handleInviteMember = useCallback(async (targetUserId) => {
    if (!activeProjectId || !targetUserId) return
    setInviteError('')
    try {
      await projectApi.addProjectMember(activeProjectId, { userId: targetUserId, role: inviteRole })
      setInviteSearch('')
      setInviteResults([])
      refetchMembers(activeProjectId)
    } catch (err) {
      setInviteError(err?.message || t('common.actionFailed'))
    }
  }, [activeProjectId, inviteRole, refetchMembers, t])

  const handleRemoveMember = useCallback(async (targetUserId) => {
    if (!activeProjectId || !targetUserId) return
    try {
      await projectApi.removeProjectMember(activeProjectId, targetUserId)
      refetchMembers(activeProjectId)
    } catch {
      // ignore
    }
  }, [activeProjectId, refetchMembers])

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
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
              />
            </label>
            <button type="button" className="create-issue-btn" onClick={handleOpenCreateIssue}>
              {t('boardShell.createIssue')}
            </button>
            <button type="button" className="icon-btn" aria-label={t('boardShell.notifications')}><FiBell /></button>
            <button type="button" className="icon-btn" aria-label={t('boardShell.settings')}><FiSettings /></button>
            <span className="profile-pill" aria-hidden="true">{profileInitials || '??'}</span>
          </div>
        </header>

        <div className="home-body">
          <aside className="home-sidebar" aria-label={t('boardShell.sideNavLabel')}>
            <div className="team-summary">
              <span className="team-avatar">{toInitials(activeProject?.name || t('boardShell.teamName')) || 'A'}</span>
              <div>
                <p className="team-name">{activeProject?.name || t('boardShell.teamName')}</p>
                <p className="team-type">
                  {activeProject?.key ? `${activeProject.key} · ${t('boardShell.teamType')}` : t('boardShell.teamType')}
                </p>
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
              <button type="button" className="footer-link" onClick={serverSignOut}><FiLogOut /> {t('auth.signOut')}</button>
            </div>
          </aside>

          <section className="dashboard-main">
            {isOverviewView ? (
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
                    <button type="button" className="filter-btn"><FiFilter /> {t('common.filter')}</button>
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
                        <button type="button" className="filter-btn" onClick={handleOpenCreateProject}>
                          {t('projects.create.open')}
                        </button>
                      </div>
                    </header>

                    {showCreateProject ? (
                      <form className="inline-form" onSubmit={handleSubmitCreateProject}>
                        <div className="inline-form-grid">
                          <label className="inline-field" htmlFor="new-project-name">
                            <span className="inline-label">{t('projects.create.name')}</span>
                            <input
                              id="new-project-name"
                              className="inline-input"
                              value={newProjectName}
                              onChange={(e) => setNewProjectName(e.target.value)}
                              placeholder={t('projects.create.namePlaceholder')}
                              autoComplete="off"
                            />
                          </label>

                          <label className="inline-field" htmlFor="new-project-key">
                            <span className="inline-label">{t('projects.create.key')}</span>
                            <input
                              id="new-project-key"
                              className="inline-input"
                              value={newProjectKey}
                              onChange={(e) => setNewProjectKey(normalizeProjectKey(e.target.value))}
                              placeholder={t('projects.create.keyPlaceholder')}
                              autoComplete="off"
                            />
                          </label>

                          <label className="inline-field" htmlFor="new-project-type">
                            <span className="inline-label">{t('projects.create.type')}</span>
                            <select
                              id="new-project-type"
                              className="inline-select"
                              value={newProjectType}
                              onChange={(e) => setNewProjectType(e.target.value)}
                            >
                              <option value="kanban">{t('projects.create.typeKanban')}</option>
                              <option value="scrum">{t('projects.create.typeScrum')}</option>
                            </select>
                          </label>

                          <label className="inline-field inline-field-span" htmlFor="new-project-description">
                            <span className="inline-label">{t('projects.create.description')}</span>
                            <input
                              id="new-project-description"
                              className="inline-input"
                              value={newProjectDescription}
                              onChange={(e) => setNewProjectDescription(e.target.value)}
                              placeholder={t('projects.create.descriptionPlaceholder')}
                              autoComplete="off"
                            />
                          </label>
                        </div>

                        {createProjectError ? <p className="inline-error">{createProjectError}</p> : null}

                        <div className="inline-form-actions">
                          <button className="create-issue-btn" type="submit" disabled={createProjectLoading}>
                            {createProjectLoading ? t('projects.create.creating') : t('projects.create.submit')}
                          </button>
                          <button className="filter-btn" type="button" onClick={handleCancelCreateProject}>
                            {t('projects.create.cancel')}
                          </button>
                        </div>
                      </form>
                    ) : null}

                    <div className="project-grid">
                      {recentProjects.map((project) => {
                        const ProjectIcon = FiBriefcase

                        return (
                          <article
                            key={project.id}
                            className="project-card"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleProjectSelect(project.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') handleProjectSelect(project.id)
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
                        <button type="button" className="open-btn">{t('common.open')}</button>
                      </article>
                      )
                    })}
                  </div>
                </section>
              </>
            ) : null}

            {isBacklogView ? (
              <section className="placeholder-panel panel">
                <header className="panel-head">
                  <h2>{t('backlog.title')}</h2>
                  <p>{activeProject?.name ? `${t('common.project')}: ${activeProject.name}` : t('projects.noProjectSelected')}</p>
                </header>

                {issuesLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
                {issuesError ? <p className="dashboard-kicker">{issuesError}</p> : null}

                <div className="assigned-list">
                  {backlogItems.length === 0 ? (
                    <article className="assigned-item">
                      <div>
                        <h3>{t('backlog.empty')}</h3>
                        <p>{t('backlog.emptyHint')}</p>
                      </div>
                    </article>
                  ) : null}

                  {backlogItems.map((issue) => {
                    const pr = priorityDisplay(issue?.priority)
                    const assignee = issue?.assigneeId ? usersById[String(issue.assigneeId)] : null
                    const assigneeInitials = toInitials(assignee?.name || assignee?.email || '')
                    const due = formatShortDate(issue?.dueDate, activeLocale)
                    return (
                      <article key={issue?.key} className="assigned-item">
                        <div>
                          <p className="task-code">{issue?.key}</p>
                          <h3>{issue?.title}</h3>
                          <p>
                            {t(`issue.status.${safeLower(issue?.status)}`, { defaultValue: String(issue?.status || '-') })}
                            {' · '}
                            {t(`priority.${pr.tone}`, { defaultValue: pr.label })}
                            {due ? ` · ${t('common.due')}: ${due}` : ''}
                            {assigneeInitials ? ` · ${t('common.assignee')}: ${assigneeInitials}` : ''}
                          </p>
                        </div>
                        <button type="button" className="open-btn">{t('common.open')}</button>
                      </article>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {isTeamView ? (
              <section className="placeholder-panel panel">
                <header className="panel-head">
                  <h2>{t('team.title')}</h2>
                  <p>{activeProject?.name ? `${t('common.project')}: ${activeProject.name}` : t('projects.noProjectSelected')}</p>
                </header>

                <div className="assigned panel" style={{ marginTop: '0.8rem' }}>
                  <header className="panel-head">
                    <h2>{t('team.invite.title')}</h2>
                    <p>{t('team.invite.subtitle')}</p>
                  </header>

                  <label className="issue-search" htmlFor="invite-search">
                    <FiSearch className="issue-search-icon" aria-hidden="true" />
                    <input
                      id="invite-search"
                      type="search"
                      placeholder={t('team.invite.searchPlaceholder')}
                      value={inviteSearch}
                      onChange={(e) => setInviteSearch(e.target.value)}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span className="dashboard-kicker">{t('team.invite.role')}</span>
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                      <option value="admin">{t('roles.admin')}</option>
                      <option value="member">{t('roles.member')}</option>
                      <option value="viewer">{t('roles.viewer')}</option>
                    </select>
                  </div>

                  {inviteLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
                  {inviteError ? <p className="dashboard-kicker">{inviteError}</p> : null}

                  <div className="assigned-list" style={{ marginTop: '0.6rem' }}>
                    {(Array.isArray(inviteResults) ? inviteResults : []).map((u) => (
                      <article key={u?.id} className="assigned-item">
                        <div>
                          <p className="task-code">{toInitials(u?.name || u?.email || '')}</p>
                          <h3>{u?.name || t('common.unknown')}</h3>
                          <p>{u?.email}</p>
                        </div>
                        <button type="button" className="open-btn" onClick={() => handleInviteMember(u?.id)}>
                          {t('team.invite.add')}
                        </button>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="assigned panel" style={{ marginTop: '0.8rem' }}>
                  <header className="panel-head">
                    <h2>{t('team.members.title')}</h2>
                    <p>{t('team.members.subtitle')}</p>
                  </header>

                  {membersLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
                  {membersError ? <p className="dashboard-kicker">{membersError}</p> : null}

                  <div className="assigned-list">
                    {members.map((m) => {
                      const u = usersById[String(m?.userId)]
                      return (
                        <article key={m?.userId} className="assigned-item">
                          <div>
                            <p className="task-code">{toInitials(u?.name || u?.email || '') || '??'}</p>
                            <h3>{u?.name || t('common.unknown')}</h3>
                            <p>
                              {u?.email ? `${u.email} · ` : ''}
                              {t('team.members.role')}: {t(`roles.${safeLower(m?.role)}`, { defaultValue: String(m?.role || '-') })}
                            </p>
                          </div>
                          <button type="button" className="open-btn" onClick={() => handleRemoveMember(m?.userId)}>
                            {t('team.members.remove')}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                </div>
              </section>
            ) : null}

            {isBoardView ? (
              <section className="board-shell" aria-label="Draggable board">
                <header className="dashboard-header board-header">
                  <div>
                    <p className="dashboard-kicker">{t('boardShell.contentTitle')}</p>
                    <h1>{boardDetail?.name || t('board.title')}</h1>
                    <p className="board-subtitle">{t('boardShell.contentSubtitle')}</p>
                  </div>

                  <div className="dashboard-actions board-actions">
                    <div className="mini-avatars" aria-hidden="true">
                      <span>AN</span>
                      <span>AR</span>
                      <span>MT</span>
                    </div>
                    <button type="button" className="filter-btn"><FiFilter /> {t('common.filters')}</button>
                  </div>
                </header>

                <section className="board-flow panel">
                  <div className="flow-header">
                    <h2>{t('board.flowProgress')}</h2>
                    <p>{boardDoneCount}/{boardTaskTotal} {t('board.completed')}</p>
                  </div>

                  <div className="flow-track" aria-hidden="true">
                    {kanbanColumns.map((column, index) => (
                      <div key={column.id} className="flow-step-wrap">
                        <div className={`flow-step is-${column.tone}`}>
                          <span>{column.title}</span>
                          <strong>{column.items.length}</strong>
                        </div>
                        {index < kanbanColumns.length - 1 ? <FiChevronRight className="flow-arrow" /> : null}
                      </div>
                    ))}
                  </div>

                  <div className="board-progress">
                    <div className="board-progress-track" aria-hidden="true">
                      <span style={{ width: `${boardCompletion}%` }} />
                    </div>
                    <span>{boardCompletion}% {t('board.completion')}</span>
                  </div>
                </section>

                <section className="board-columns" aria-label="Kanban lanes">
                  {kanbanColumns.map((column) => (
                    <article
                      key={column.id}
                      className={`board-column is-${column.tone} ${dropColumnID === column.id ? 'is-drop-target' : ''}`}
                      onDragOver={(event) => handleColumnDragOver(event, column.id)}
                      onDrop={(event) => handleColumnDrop(event, column.id)}
                    >
                      <header className="board-column-head">
                        <div>
                          <h3>{column.title}</h3>
                          <p>{column.items.length} {t('board.cards')}</p>
                        </div>
                        <button type="button" className="lane-add-btn" aria-label={t('board.addCardTo', { column: column.title })}>
                          <FiPlus />
                        </button>
                      </header>

                      <div className="board-card-list">
                        {column.items.map((item) => {
                          const pr = priorityDisplay(item?.priority)
                          const due = formatShortDate(item?.dueDate, activeLocale)
                          const assignee = item?.assigneeId ? usersById[String(item.assigneeId)] : null
                          const assigneeInitials = toInitials(assignee?.name || assignee?.email || '')
                          return (
                          <article
                            key={item.key}
                            className={`board-card ${dragState?.cardID === item.key ? 'is-dragging' : ''}`}
                            draggable
                            onDragStart={(event) => handleCardDragStart(event, column.id, item.key)}
                            onDragEnd={handleCardDragEnd}
                          >
                            <p className="board-card-code">{item.key}</p>
                            <h4>{item.title}</h4>

                            <div className="board-card-tags">
                              <span className={`task-tag tone-${labelToneFromIssueType(item?.type)}`}>{t(`issue.type.${safeLower(item?.type)}`, { defaultValue: safeLower(item?.type) || t('issue.type.task') })}</span>
                              <span className={`task-priority tone-${pr.tone}`}>{t(`priority.${pr.tone}`, { defaultValue: pr.label })}</span>
                            </div>

                            <div className="board-progress-track compact" aria-hidden="true">
                              <span style={{ width: `${BOARD_STAGE_PROGRESS[column.id] ?? 25}%` }} />
                            </div>

                            <footer className="board-card-foot">
                              <span><FiClock /> {due || t('common.noDueDateShort')}</span>
                              <span className="assignee-pill">{assigneeInitials || '??'}</span>
                            </footer>
                          </article>
                          )
                        })}
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
                  {t('common.backToOverview')}
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
