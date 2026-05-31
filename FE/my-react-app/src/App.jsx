import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { StatsOverview } from './shared/components/stats-overview/StatsOverview.jsx'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Login from './features/auth/pages/Login'
import { useAuth } from './features/auth/model/AuthContext'
import IssueDetailsPage from './features/issues/pages/IssueDetailsPage'
import IssuesPage from './features/issues/pages/IssuesPage'
import ProfilePage from './features/users/pages/ProfilePage'
import { useKanbanState } from './features/kanban/hooks'
import { OverviewPanel, BoardPanel, ReportsPanel, ArchivePanel, TeamPanel } from './features/kanban/components'
import * as projectApi from './features/projects/api/projectApi'
import * as boardApi from './features/boards/api/boardApi'
import * as issueApi from './features/issues/api/issueApi'
import * as userApi from './features/users/api/userApi'
import * as sprintApi from './features/sprints/api/sprintApi'
import * as activityApi from './features/activity/api/activityApi'
import * as labelApi from './features/labels/api/labelApi'
import BacklogView from './features/sprints/components/BacklogView'
import FilterBar from './shared/components/FilterBar'
import GlobalSearch from './shared/components/GlobalSearch'
import { WsClient } from './shared/ws/wsClient'
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
  FiX,
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
  const navigate = useNavigate()
  const location = useLocation()
  const { user, refreshMe, serverSignOut } = useAuth()
  const [topbarPopover, setTopbarPopover] = useState('')
  const popoverRef = useRef(null)
  const [projectLabels, setProjectLabels] = useState([])
  const [issueFilters, setIssueFilters] = useState({
    search: '',
    status: '',
    type: '',
    priority: '',
    assignee: '',
    label: '',
    sprint: '',
    reporter: '',
  })
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [editingSprint, setEditingSprint] = useState(null)
  const {
    activeTopTab,
    setActiveTopTab,
    activeSideLink,
    setActiveSideLink,
    activeIssueKey,
    setActiveIssueKey,
    dragState,
    setDragState,
    dropColumnID,
    setDropColumnID,
    setHeaderSearch,
    projects,
    setProjects,
    projectsLoading,
    setProjectsLoading,
    projectsError,
    setProjectsError,
    showCreateProject,
    setShowCreateProject,
    createProjectLoading,
    setCreateProjectLoading,
    createProjectError,
    setCreateProjectError,
    newProjectName,
    setNewProjectName,
    newProjectKey,
    setNewProjectKey,
    newProjectDescription,
    setNewProjectDescription,
    newProjectType,
    setNewProjectType,
    activeProjectId,
    setActiveProjectId,
    activeBoardId,
    setActiveBoardId,
    boardDetail,
    setBoardDetail,
    boardColumnsMeta,
    setBoardColumnsMeta,
    issuesData,
    setIssuesData,
    issuesLoading,
    setIssuesLoading,
    issuesError,
    setIssuesError,
    assignedIssues,
    setAssignedIssues,
    members,
    setMembers,
    membersLoading,
    setMembersLoading,
    membersError,
    setMembersError,
    inviteSearch,
    setInviteSearch,
    inviteRole,
    setInviteRole,
    inviteResults,
    setInviteResults,
    inviteLoading,
    setInviteLoading,
    inviteError,
    setInviteError,
    showCreateIssue,
    setShowCreateIssue,
    createIssueLoading,
    setCreateIssueLoading,
    createIssueError,
    setCreateIssueError,
    newIssueProjectId,
    setNewIssueProjectId,
    newIssueType,
    setNewIssueType,
    newIssuePriority,
    setNewIssuePriority,
    newIssueTitle,
    setNewIssueTitle,
    newIssueDescription,
    setNewIssueDescription,
    newIssueAssigneeId,
    setNewIssueAssigneeId,
    newIssueSprintId,
    setNewIssueSprintId,
    newIssueLabels,
    setNewIssueLabels,
    createIssueCreateAnother,
    setCreateIssueCreateAnother,
    sprints,
    setSprints,
    setSprintsLoading,
    setSprintsError,
    setActiveSprint,
    showCreateSprint,
    setShowCreateSprint,
    createSprintLoading,
    setCreateSprintLoading,
    createSprintError,
    setCreateSprintError,
    newSprintName,
    setNewSprintName,
    newSprintDescription,
    setNewSprintDescription,
    setBacklogIssues,
    backlogLoading,
    setBacklogLoading,
    activityLog,
    setActivityLog,
    activityLoading,
    setActivityLoading,
    activityError,
    setActivityError,
    wsClientRef,
    usersById,
    setUsersById,
    userFetchInFlight,
  } = useKanbanState()

  const activeLang = useMemo(() => {
    const current = i18n.resolvedLanguage || i18n.language || 'vi'
    return current.startsWith('vi') ? 'vi' : 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const activeLocale = useMemo(() => (activeLang === 'vi' ? 'vi-VN' : 'en-US'), [activeLang])

  const topTabs = t('boardShell.topTabs', { returnObjects: true })
  const sideLinks = t('boardShell.sideLinks', { returnObjects: true })

  const formatActivityAction = useCallback((a) => {
    const action = safeLower(a?.action)
    if (!action) return ''

    if (action === 'status_changed') {
      const from = safeLower(a?.oldValue)
      const to = safeLower(a?.newValue)
      const fromLabel = from ? t(`issue.status.${from}`, { defaultValue: String(a?.oldValue || '') }) : ''
      const toLabel = to ? t(`issue.status.${to}`, { defaultValue: String(a?.newValue || '') }) : ''
      if (fromLabel && toLabel) {
        return `${t('activity.actions.status_changed', { defaultValue: 'Status changed' })}: ${fromLabel} → ${toLabel}`
      }
      return t('activity.actions.status_changed', { defaultValue: 'Status changed' })
    }

    return t(`activity.actions.${action}`, { defaultValue: String(a?.action || action) })
  }, [t])

  const activityFeed = useMemo(() => {
    const items = Array.isArray(activityLog) ? activityLog : []
    return items.slice(0, 6).map((a) => {
      const actor = usersById?.[String(a?.userId)]
      const name = actor?.name || actor?.email || t('common.unknown')
      const initials = toInitials(name)
      const action = formatActivityAction(a) || [a?.action, a?.field].filter(Boolean).join(' · ')
      const time = formatShortDate(a?.createdAt, activeLocale) || ''
      return {
        id: a?.id || `${a?.userId}-${a?.createdAt}`,
        avatar: initials || '??',
        actor: name,
        action: action || t('overview.activity.updated', { defaultValue: 'updated' }),
        time,
      }
    })
  }, [activityLog, activeLocale, formatActivityAction, t, usersById])

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

  const refetchIssues = useCallback(async (projectId, overrides = {}) => {
    if (!projectId) return
    setIssuesLoading(true)
    setIssuesError('')
    try {
      const query = {
        search: issueFilters.search ? String(issueFilters.search) : '',
        status: issueFilters.status || '',
        type: issueFilters.type || '',
        priority: issueFilters.priority || '',
        assignee: issueFilters.assignee || '',
        label: issueFilters.label || '',
        sprint: issueFilters.sprint || '',
        reporter: issueFilters.reporter || '',
        ...overrides,
      }
      const data = await issueApi.listIssues(projectId, {
        page: 0,
        per_page: 50,
        ...query,
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
  }, [ensureUsersLoaded, issueFilters, t])

  const refetchAssigned = useCallback(async (projectId) => {
    if (!projectId) return
    try {
      const data = await issueApi.listIssues(projectId, { assignee: 'me', per_page: 10 })
      const items = Array.isArray(data?.items) ? data.items : []
      const mine = user?.id
        ? items.filter((it) => String(it?.assigneeId ?? '') === String(user.id))
        : items
      setAssignedIssues(mine.slice(0, 2))
      await ensureUsersLoaded(items.map((i) => i?.assigneeId).filter(Boolean))
    } catch {
      setAssignedIssues([])
    }
  }, [ensureUsersLoaded, user?.id])

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

  // ─── Sprint Handlers ───────────────────────────────────────────────────────

  const refetchSprints = useCallback(async (projectId) => {
    if (!projectId) return
    setSprintsLoading(true)
    setSprintsError('')
    try {
      const data = await sprintApi.listSprints(projectId)
      setSprints(Array.isArray(data) ? data : [])
    } catch (err) {
      setSprintsError(err?.message || t('common.actionFailed'))
    } finally {
      setSprintsLoading(false)
    }
  }, [t])

  const refetchBacklog = useCallback(async (projectId) => {
    if (!projectId) return
    setBacklogLoading(true)
    try {
      const data = await sprintApi.getBacklog(projectId, { perPage: 50 })
      setBacklogIssues(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [])
    } catch {
      // ignore
    } finally {
      setBacklogLoading(false)
    }
  }, [])

  const refetchProjectLabels = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectLabels([])
      return
    }
    try {
      const data = await labelApi.listLabels(projectId)
      setProjectLabels(Array.isArray(data) ? data : [])
    } catch {
      setProjectLabels([])
    }
  }, [])

  const handleOpenCreateSprint = useCallback(() => {
    setEditingSprint(null)
    setNewSprintName('')
    setNewSprintDescription('')
    setShowCreateSprint(true)
    setCreateSprintError('')
  }, [])

  const handleEditSprint = useCallback((sprint) => {
    setEditingSprint(sprint || null)
    setNewSprintName(String(sprint?.name || ''))
    setNewSprintDescription(String(sprint?.goal || ''))
    setShowCreateSprint(true)
    setCreateSprintError('')
  }, [])

  const handleCancelCreateSprint = useCallback(() => {
    setShowCreateSprint(false)
    setEditingSprint(null)
    setNewSprintName('')
    setNewSprintDescription('')
    setCreateSprintError('')
  }, [])

  const handleSubmitCreateSprint = useCallback(async (event) => {
    event.preventDefault()
    if (!activeProjectId) return

    const name = String(newSprintName ?? '').trim()
    if (!name) {
      setCreateSprintError(t('sprints.create.validationName'))
      return
    }

    setCreateSprintLoading(true)
    setCreateSprintError('')
    try {
      if (editingSprint?.id) {
        await sprintApi.updateSprint(editingSprint.id, {
          name,
          goal: String(newSprintDescription ?? '').trim(),
        })
      } else {
        await sprintApi.createSprint(activeProjectId, {
          name,
          goal: String(newSprintDescription ?? '').trim(),
        })
      }
      await refetchSprints(activeProjectId)
      setShowCreateSprint(false)
      setEditingSprint(null)
      setNewSprintName('')
      setNewSprintDescription('')
    } catch (err) {
      setCreateSprintError(err?.message || t('common.actionFailed'))
    } finally {
      setCreateSprintLoading(false)
    }
  }, [activeProjectId, editingSprint?.id, newSprintName, newSprintDescription, refetchSprints, t])

  const handleStartSprint = useCallback(async (sprintId) => {
    if (!sprintId) return
    try {
      await sprintApi.startSprint(sprintId)
      await refetchSprints(activeProjectId)
      setActiveSprint(sprintId)
    } catch {
      // ignore
    }
  }, [activeProjectId, refetchSprints])

  const handleCompleteSprint = useCallback(async (sprintId) => {
    if (!sprintId) return
    try {
      await sprintApi.completeSprint(sprintId)
      await refetchSprints(activeProjectId)
      await refetchBacklog(activeProjectId)
      setActiveSprint(null)
    } catch {
      // ignore
    }
  }, [activeProjectId, refetchSprints, refetchBacklog])

  // ─── Activity Handlers ─────────────────────────────────────────────────────

  const refetchProjectActivity = useCallback(async (projectId) => {
    if (!projectId) return
    setActivityLoading(true)
    setActivityError('')
    try {
      const data = await activityApi.getProjectActivity(projectId, { page: 1, perPage: 20 })
      const items = Array.isArray(data?.items) ? data.items : []
      setActivityLog(items)
      await ensureUsersLoaded(items.map((a) => a?.userId).filter(Boolean))
    } catch (err) {
      setActivityError(err?.message || '')
      setActivityLog([])
    } finally {
      setActivityLoading(false)
    }
  }, [ensureUsersLoaded])

  useEffect(() => {
    if (!topbarPopover) return
    const onMouseDown = (event) => {
      const target = event.target
      if (target?.closest?.('[data-popover-toggle="true"]')) return
      if (popoverRef.current && popoverRef.current.contains(target)) return
      setTopbarPopover('')
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setTopbarPopover('')
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [topbarPopover])

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
    refetchIssues(activeProjectId)
    refetchProjectLabels(activeProjectId)
    refetchMembers(activeProjectId)
  }, [activeProjectId, issueFilters, refetchBoards, refetchIssues, refetchProjectLabels, refetchMembers])

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

  useEffect(() => {
    if (!activeProjectId) return
    refetchSprints(activeProjectId)
    refetchBacklog(activeProjectId)
  }, [activeProjectId, refetchSprints, refetchBacklog])

  useEffect(() => {
    if (!activeProjectId) return
    refetchProjectActivity(activeProjectId)
  }, [activeProjectId, refetchProjectActivity])

  useEffect(() => {
    if (!showCreateIssue) return
    const pid = String(newIssueProjectId || '').trim()
    if (!pid) return
    refetchMembers(pid)
    refetchProjectLabels(pid)
  }, [newIssueProjectId, refetchMembers, refetchProjectLabels, showCreateIssue])

  useEffect(() => {
    if (!user?.id) return
    const ws = new WsClient()
    wsClientRef.current = ws

    ws.on('issue_updated', () => {
      // Refetch issues when updated via WebSocket
      if (activeProjectId) {
        refetchIssues(activeProjectId)
      }
    })

    ws.on('comment_added', () => {
      // Refetch activity log
      if (activeProjectId) {
        refetchProjectActivity(activeProjectId)
      }
    })

    ws.on('sprint_started', () => {
      if (activeProjectId) {
        refetchSprints(activeProjectId)
      }
    })

    ws.on('sprint_completed', () => {
      if (activeProjectId) {
        refetchSprints(activeProjectId)
        refetchBacklog(activeProjectId)
      }
    })

    try {
      ws.connect()
    } catch (err) {
      console.error('[App] Failed to connect WebSocket:', err)
    }

    return () => {
      ws.disconnect()
      wsClientRef.current = null
    }
  }, [user?.id, activeProjectId, refetchIssues, refetchProjectActivity, refetchSprints, refetchBacklog])

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
  }

  const handleFilterChange = useCallback((nextFilters) => {
    setIssueFilters(nextFilters)
    if (typeof nextFilters?.search === 'string') {
      setHeaderSearch(nextFilters.search)
    }
  }, [setHeaderSearch])

  const handleClearFilters = useCallback(() => {
    const cleared = {
      search: '',
      status: '',
      type: '',
      priority: '',
      assignee: '',
      label: '',
      sprint: '',
      reporter: '',
    }
    setIssueFilters(cleared)
    setHeaderSearch('')
  }, [setHeaderSearch])

  const handleMoveIssueToSprint = useCallback(async (issueKey, sprintId) => {
    if (!issueKey) return
    try {
      await issueApi.updateIssue(issueKey, { sprintId: sprintId || null })
      await Promise.all([
        refetchIssues(activeProjectId),
        refetchBacklog(activeProjectId),
        refetchSprints(activeProjectId),
      ])
    } catch {
      // ignore
    }
  }, [activeProjectId, refetchBacklog, refetchIssues, refetchSprints])

  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '') || '/home'

    if (path === '/home') {
      navigate('/home/dashboard', { replace: true })
      return
    }

    const issueMatch = path.match(/^\/home\/issues\/([^/]+)$/)
    if (issueMatch) {
      setActiveIssueKey(decodeURIComponent(issueMatch[1]))
      return
    }

    if (activeIssueKey) setActiveIssueKey('')

    if (path === '/home/dashboard') {
      setActiveTopTab('dashboard')
      setActiveSideLink('overview')
      return
    }

    if (path === '/home/backlog') {
      setActiveTopTab('backlog')
      setActiveSideLink('issues')
      return
    }

    if (path === '/home/team') {
      setActiveTopTab('team')
      setActiveSideLink('issues')
      return
    }

    const projectMatch = path.match(/^\/home\/projects\/([^/]+)(?:\/([^/]+))?$/)
    if (projectMatch) {
      const nextLink = projectMatch[1]
      setActiveTopTab('projects')
      setActiveSideLink(['board', 'issues', 'reports', 'archive'].includes(nextLink) ? nextLink : 'board')
    }
  }, [activeIssueKey, location.pathname, navigate])

  const handleTopTabClick = useCallback((tabID) => {
    if (tabID === 'dashboard') navigate('/home/dashboard')
    if (tabID === 'projects') navigate('/home/projects/board')
    if (tabID === 'backlog') navigate('/home/backlog')
    if (tabID === 'team') navigate('/home/team')
  }, [navigate])

  const handleSideLinkClick = useCallback((linkID) => {
    if (linkID === 'overview') navigate('/home/dashboard')
    if (linkID === 'board') navigate('/home/projects/board')
    if (linkID === 'reports') navigate('/home/projects/reports')
    if (linkID === 'archive') navigate('/home/projects/archive')
    if (linkID === 'issues') navigate('/home/projects/issues')
  }, [navigate])

  const handleOpenIssueDetails = useCallback((issueKey) => {
    const key = String(issueKey ?? '').trim()
    if (!key) return
    navigate(`/home/issues/${encodeURIComponent(key)}`, { state: { from: location.pathname } })
  }, [location.pathname, navigate])

  const handleSelectProjectIssue = useCallback((issueKey, options = {}) => {
    const key = String(issueKey ?? '').trim()
    if (!key) return
    navigate(`/home/projects/issues/${encodeURIComponent(key)}`, { replace: Boolean(options?.replace) })
  }, [navigate])

  const handleCloseIssueDetails = useCallback(() => {
    navigate(location.state?.from || '/home/projects/board')
  }, [location.state, navigate])

  const resetCreateIssueForm = useCallback(() => {
    setNewIssueType('task')
    setNewIssuePriority('medium')
    setNewIssueTitle('')
    setNewIssueDescription('')
    setNewIssueAssigneeId('')
    setNewIssueSprintId('')
    setNewIssueLabels([])
    setCreateIssueError('')
  }, [])

  const handleOpenCreateIssue = useCallback(() => {
    setCreateIssueError('')
    setNewIssueProjectId(String(activeProjectId || projects?.[0]?.id || ''))
    setShowCreateIssue(true)
    if (activeProjectId) {
      refetchMembers(activeProjectId)
    }
    // focus later when modal renders
    setTimeout(() => {
      try {
        const el = document.getElementById('new-issue-title')
        if (el) el.focus()
      } catch {
        /* ignore */
      }
    }, 60)
  }, [activeProjectId, projects, refetchMembers])

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const tag = String(target?.tagName || '').toLowerCase()
      const isFormField = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 'k') {
        event.preventDefault()
        setShowGlobalSearch(true)
        return
      }

      if (event.key === 'Escape') {
        setShowGlobalSearch(false)
        setShowShortcutHelp(false)
        return
      }

      if (isFormField) return

      if (String(event.key).toLowerCase() === 'c') {
        event.preventDefault()
        handleOpenCreateIssue()
      }
      if (String(event.key).toLowerCase() === 'b') {
        event.preventDefault()
        navigate(activeTopTab === 'backlog' ? '/home/projects/board' : '/home/backlog')
      }
      if (event.key === '?') {
        event.preventDefault()
        setShowShortcutHelp((prev) => !prev)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeTopTab, handleOpenCreateIssue, navigate])

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
    const assigneeId = String(newIssueAssigneeId ?? '').trim() || null
    const sprintId = String(newIssueSprintId ?? '').trim() || null

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
      const payload = {
        title,
        type,
        priority,
        description,
        ...(assigneeId && { assigneeId }),
        ...(sprintId && { sprintId }),
      }
      const created = await issueApi.createIssue(projectId, payload)

      if (Array.isArray(newIssueLabels) && newIssueLabels.length > 0 && created?.key) {
        await Promise.all(newIssueLabels.map((labelId) => labelApi.attachLabelToIssue(created.key, labelId)))
      }

      setActiveProjectId(projectId)
      await refetchIssues(projectId)
      await refetchAssigned(projectId)
      await refetchProjectLabels(projectId)

      if (!createIssueCreateAnother) {
        setShowCreateIssue(false)
        resetCreateIssueForm()
        setCreateIssueCreateAnother(false)
      } else {
        // Keep modal open, reset form for next issue but keep project/type
        setNewIssueTitle('')
        setNewIssueDescription('')
        setNewIssueAssigneeId('')
        setNewIssueSprintId('')
        setNewIssueLabels([])
        setCreateIssueError('')
      }
    } catch (err) {
      setCreateIssueError(err?.message || t('common.actionFailed'))
    } finally {
      setCreateIssueLoading(false)
    }
  }, [refetchAssigned, refetchIssues, refetchProjectLabels, resetCreateIssueForm, t, activeProjectId, newIssueProjectId, newIssueTitle, newIssueDescription, newIssueType, newIssuePriority, newIssueAssigneeId, newIssueSprintId, newIssueLabels, createIssueCreateAnother])

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
  }, [])  // state setters don't need dependencies

  useEffect(() => {
    if (!activeProjectId) return
    if (!activeIssueKey) return
    if (Array.isArray(members) && members.length > 0) return
    refetchMembers(activeProjectId)
  }, [activeIssueKey, activeProjectId, members, refetchMembers])

  const isBoardView = activeTopTab === 'projects'
  const isOverviewView = activeTopTab === 'dashboard'
  const isBacklogView = activeTopTab === 'backlog'
  const isTeamView = activeTopTab === 'team'

  const isPlaceholderView = !(isBoardView || isOverviewView || isBacklogView || isTeamView)

  const selectedProjectIssueKey = useMemo(() => {
    const match = location.pathname.match(/^\/home\/projects\/issues\/([^/]+)$/)
    return match ? decodeURIComponent(match[1]) : ''
  }, [location.pathname])

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

  const createProjectModal = useMemo(() => {
    if (!showCreateProject) return null
    return createPortal(
      <div className="modal-overlay" role="presentation" onMouseDown={handleCancelCreateProject}>
        <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
          <header className="modal-head">
            <div>
              <h2>{t('projects.create.title')}</h2>
              <p>{t('projects.create.subtitle')}</p>
            </div>
            <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={handleCancelCreateProject}>
              <FiX />
            </button>
          </header>

          <form className="modal-body" onSubmit={handleSubmitCreateProject}>
            <div className="modal-grid">
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

              <label className="inline-field modal-span" htmlFor="new-project-description">
                <span className="inline-label">{t('projects.create.description')}</span>
                <textarea
                  id="new-project-description"
                  className="modal-textarea"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder={t('projects.create.descriptionPlaceholder')}
                  rows={6}
                />
              </label>
            </div>

            {createProjectError ? <p className="inline-error">{createProjectError}</p> : null}

            <footer className="modal-actions">
              <button type="button" className="filter-btn" onClick={handleCancelCreateProject}>
                {t('projects.create.cancel')}
              </button>
              <button type="submit" className="create-issue-btn" disabled={createProjectLoading}>
                {createProjectLoading ? t('projects.create.creating') : t('projects.create.submit')}
              </button>
            </footer>
          </form>
        </div>
      </div>,
      document.body,
    )
  }, [
    createProjectError,
    createProjectLoading,
    handleCancelCreateProject,
    handleSubmitCreateProject,
    newProjectDescription,
    newProjectKey,
    newProjectName,
    newProjectType,
    normalizeProjectKey,
    showCreateProject,
    t,
  ])

  const createSprintModal = useMemo(() => {
    if (!showCreateSprint) return null
    return createPortal(
      <div className="modal-overlay" role="presentation" onMouseDown={handleCancelCreateSprint}>
        <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
          <header className="modal-head">
            <div>
              <h2>{editingSprint ? t('sprints.edit.title', { defaultValue: 'Edit sprint' }) : t('sprints.create.title')}</h2>
              <p>{editingSprint ? t('sprints.edit.subtitle', { defaultValue: 'Update sprint details' }) : t('sprints.create.subtitle')}</p>
            </div>
            <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={handleCancelCreateSprint}>
              <FiX />
            </button>
          </header>

          <form className="modal-body" onSubmit={handleSubmitCreateSprint}>
            <label className="inline-field modal-span" htmlFor="new-sprint-name">
              <span className="inline-label">{t('sprints.create.name')}</span>
              <input
                id="new-sprint-name"
                className="inline-input"
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
                placeholder={t('sprints.create.namePlaceholder')}
                autoComplete="off"
                autoFocus
              />
            </label>

            <label className="inline-field modal-span" htmlFor="new-sprint-description">
              <span className="inline-label">{t('sprints.goal', { defaultValue: 'Goal' })}</span>
              <textarea
                id="new-sprint-description"
                className="modal-textarea"
                value={newSprintDescription}
                onChange={(e) => setNewSprintDescription(e.target.value)}
                placeholder={t('sprints.goalPlaceholder', { defaultValue: 'What should this sprint deliver?' })}
                rows={4}
              />
            </label>

            {createSprintError ? <p className="inline-error">{createSprintError}</p> : null}

            <footer className="modal-actions">
              <button type="button" className="filter-btn" onClick={handleCancelCreateSprint}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="create-issue-btn" disabled={createSprintLoading}>
                {createSprintLoading ? t('sprints.create.creating') : editingSprint ? t('common.save') : t('sprints.create.submit')}
              </button>
            </footer>
          </form>
        </div>
      </div>,
      document.body,
    )
  }, [
    createSprintError,
    createSprintLoading,
    handleCancelCreateSprint,
    handleSubmitCreateSprint,
    newSprintDescription,
    newSprintName,
    editingSprint,
    showCreateSprint,
    t,
  ])

  const createIssueModal = useMemo(() => {
    if (!showCreateIssue) return null
    return createPortal(
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
                      className={`priority-pill tone-${p} ${newIssuePriority === p ? 'is-active' : ''}`}
                      onClick={() => setNewIssuePriority(p)}
                    >
                      {t(`priority.${p}`)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="inline-field" htmlFor="new-issue-assignee">
                <span className="inline-label">{t('issues.create.assignee')}</span>
                <select
                  id="new-issue-assignee"
                  className="inline-select"
                  value={newIssueAssigneeId}
                  onChange={(e) => setNewIssueAssigneeId(e.target.value)}
                >
                  <option value="">{t('issues.create.assigneePlaceholder')}</option>
                  {(Array.isArray(members) ? members : []).map((m) => {
                    const userId = String(m?.userId ?? '')
                    const u = userId ? usersById?.[userId] : null
                    const label = u?.name || u?.email || t('common.unknown')
                    return (
                      <option key={userId || m?.id} value={userId}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </label>

              <label className="inline-field" htmlFor="new-issue-sprint">
                <span className="inline-label">{t('issues.create.sprint')}</span>
                <select
                  id="new-issue-sprint"
                  className="inline-select"
                  value={newIssueSprintId}
                  onChange={(e) => setNewIssueSprintId(e.target.value)}
                >
                  <option value="">{t('issues.create.sprintPlaceholder')}</option>
                  {(Array.isArray(sprints) ? sprints : []).map((sp) => (
                    <option key={sp?.id} value={sp?.id}>{sp?.name || t('common.unknown')}</option>
                  ))}
                </select>
              </label>

              <div className="inline-field modal-span">
                <span className="inline-label">{t('issues.detail.labels', { defaultValue: 'Labels' })}</span>
                <div className="label-row">
                  {projectLabels.map((label) => {
                    const isActive = newIssueLabels.includes(label?.id)
                    return (
                      <button
                        key={label?.id}
                        type="button"
                        className={`issue-label-option ${isActive ? 'is-active' : ''}`}
                        onClick={() => setNewIssueLabels((prev) => (
                          prev.includes(label?.id)
                            ? prev.filter((id) => id !== label?.id)
                            : [...prev, label?.id]
                        ))}
                      >
                        <span className="issue-label-dot" style={label?.color ? { background: label.color } : undefined} />
                        {label?.name}
                      </button>
                    )
                  })}
                  {projectLabels.length === 0 ? <span className="muted">{t('labels.empty', { defaultValue: 'No labels yet' })}</span> : null}
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

            <label className="inline-checkbox">
              <input
                type="checkbox"
                checked={createIssueCreateAnother}
                onChange={(e) => setCreateIssueCreateAnother(e.target.checked)}
              />
              <span>{t('issues.create.createAnother')}</span>
            </label>

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
      </div>,
      document.body,
    )
  }, [
    createIssueCreateAnother,
    createIssueError,
    createIssueLoading,
    handleCancelCreateIssue,
    handleSubmitCreateIssue,
    members,
    usersById,
    newIssueAssigneeId,
    newIssueDescription,
    newIssuePriority,
    newIssueProjectId,
    newIssueSprintId,
    newIssueTitle,
    newIssueType,
    newIssueLabels,
    projectLabels,
    projects,
    sprints,
    showCreateIssue,
    t,
  ])

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
            <label className="project-picker" htmlFor="header-project-select">
              <select
                id="header-project-select"
                aria-label={t('common.project')}
                value={String(activeProjectId ?? '')}
                onChange={(e) => setActiveProjectId(String(e.target.value ?? ''))}
                disabled={projectsLoading || !(Array.isArray(projects) && projects.length > 0)}
              >
                {!activeProjectId ? (
                  <option value="" disabled>{t('projects.noProjectSelected')}</option>
                ) : null}
                {(Array.isArray(projects) ? projects : []).map((p) => (
                  <option key={p?.id} value={p?.id}>{p?.name || t('projects.untitled')}</option>
                ))}
              </select>
            </label>
            <label className="issue-search" htmlFor="header-issue-search">
              <FiSearch className="issue-search-icon" aria-hidden="true" />
              <input
                id="header-issue-search"
                type="search"
                placeholder={t('boardShell.searchPlaceholder')}
                value={issueFilters.search}
                onChange={(e) => handleFilterChange({ ...issueFilters, search: e.target.value })}
              />
            </label>
            <button type="button" className="filter-btn" onClick={handleOpenCreateProject}>
              <FiPlus /> {t('projects.create.open')}
            </button>
            <button type="button" className="create-issue-btn" onClick={handleOpenCreateIssue}>
              {t('boardShell.createIssue')}
            </button>
            <button
              type="button"
              className={`icon-btn ${topbarPopover === 'notifications' ? 'is-active' : ''}`}
              aria-label={t('boardShell.notifications')}
              data-popover-toggle="true"
              onClick={() => setTopbarPopover((prev) => (prev === 'notifications' ? '' : 'notifications'))}
            >
              <FiBell />
            </button>
            <button
              type="button"
              className={`icon-btn ${topbarPopover === 'settings' ? 'is-active' : ''}`}
              aria-label={t('boardShell.settings')}
              data-popover-toggle="true"
              onClick={() => setTopbarPopover((prev) => (prev === 'settings' ? '' : 'settings'))}
            >
              <FiSettings />
            </button>
            <button
              type="button"
              className={`profile-pill ${topbarPopover === 'profile' ? 'is-active' : ''}`}
              aria-label={t('boardShell.profile', { defaultValue: 'Profile' })}
              data-popover-toggle="true"
              onClick={() => setTopbarPopover((prev) => (prev === 'profile' ? '' : 'profile'))}
            >
              {profileInitials || '??'}
            </button>

            {topbarPopover ? (
              <div ref={popoverRef} className="topbar-popover" role="dialog" aria-label={t('boardShell.popover', { defaultValue: 'Menu' })}>
                {topbarPopover === 'notifications' ? (
                  <>
                    <p className="topbar-popover-title">{t('boardShell.notifications')}</p>
                    <div className="topbar-popover-list">
                      {activityLoading ? (
                        <p className="topbar-popover-muted">{t('common.loading')}</p>
                      ) : null}
                      {activityError ? (
                        <p className="topbar-popover-muted">{activityError}</p>
                      ) : null}
                      {!activityLoading && activityFeed.length === 0 ? (
                        <p className="topbar-popover-muted">{t('overview.activity.empty')}</p>
                      ) : null}
                      {activityFeed.map((it) => (
                        <div key={it.id} className="topbar-popover-item">
                          <span className="activity-avatar">{it.avatar}</span>
                          <div>
                            <p><strong>{it.actor}</strong> {it.action}</p>
                            <span>{it.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                {topbarPopover === 'settings' ? (
                  <>
                    <p className="topbar-popover-title">{t('boardShell.settings')}</p>
                    <p className="topbar-popover-muted">{t('common.comingSoon', { defaultValue: 'Coming soon' })}</p>
                  </>
                ) : null}

                {topbarPopover === 'profile' ? (
                  <>
                    <p className="topbar-popover-title">{user?.name || user?.email || t('common.unknown')}</p>
                    <p className="topbar-popover-muted">{user?.email || ''}</p>
                    <div className="topbar-popover-actions">
                      <button type="button" className="filter-btn" onClick={() => navigate('/profile')}>
                        {t('boardShell.profile', { defaultValue: 'Profile' })}
                      </button>
                      <button type="button" className="filter-btn" onClick={serverSignOut}>
                        <FiLogOut /> {t('auth.signOut')}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        {createProjectModal}
        {createSprintModal}
        {createIssueModal}
        <GlobalSearch
          t={t}
          open={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
          projectId={activeProjectId}
          onOpenIssueDetails={handleOpenIssueDetails}
          onOpenProject={handleProjectSelect}
        />
        {showShortcutHelp ? createPortal(
          <div className="modal-overlay" role="presentation" onMouseDown={() => setShowShortcutHelp(false)}>
            <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
              <header className="modal-head">
                <div>
                  <h2>{t('shortcuts.title', { defaultValue: 'Keyboard shortcuts' })}</h2>
                  <p>{t('shortcuts.subtitle', { defaultValue: 'Quick actions available in the app' })}</p>
                </div>
                <button type="button" className="icon-btn" onClick={() => setShowShortcutHelp(false)} aria-label={t('common.close')}>
                  <FiX />
                </button>
              </header>
              <div className="modal-body">
                <div className="shortcut-list">
                  <p><strong>C</strong> {t('shortcuts.createIssue', { defaultValue: 'Create issue' })}</p>
                  <p><strong>Ctrl/Cmd + K</strong> {t('shortcuts.globalSearch', { defaultValue: 'Open global search' })}</p>
                  <p><strong>B</strong> {t('shortcuts.toggleBoard', { defaultValue: 'Toggle board/backlog' })}</p>
                  <p><strong>?</strong> {t('shortcuts.help', { defaultValue: 'Show keyboard shortcuts' })}</p>
                  <p><strong>Esc</strong> {t('shortcuts.close', { defaultValue: 'Close current modal' })}</p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        ) : null}

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

            <button type="button" className="invite-member-btn" onClick={() => handleTopTabClick('team')}><FiUserPlus /> {t('boardShell.inviteMember')}</button>

            <div className="sidebar-footer">
              <button type="button" className="footer-link"><FiHelpCircle /> {t('boardShell.help')}</button>
              <button type="button" className="footer-link"><FiMessageSquare /> {t('boardShell.feedback')}</button>
              <button type="button" className="footer-link" onClick={serverSignOut}><FiLogOut /> {t('auth.signOut')}</button>
            </div>
          </aside>

          <section className="dashboard-main">
            {activeIssueKey ? (
              <IssueDetailsPage
                issueKey={activeIssueKey}
                onBack={handleCloseIssueDetails}
                projectName={activeProject?.name || ''}
                locale={activeLocale}
                members={members}
                usersById={usersById}
              />
            ) : null}

            {!activeIssueKey && (isBacklogView || (isBoardView && activeSideLink !== 'issues')) ? (
              <FilterBar
                t={t}
                filters={issueFilters}
                onChange={handleFilterChange}
                onClear={handleClearFilters}
                members={members}
                labels={projectLabels}
                sprints={sprints}
                usersById={usersById}
              />
            ) : null}

            {isOverviewView ? (
              <OverviewPanel
                t={t}
                recentProjects={recentProjects}
                activityFeed={activityFeed}
                assignedIssues={assignedIssues}
                statsCards={statsCards}
                activeLocale={activeLocale}
                projectsLoading={projectsLoading}
                projectsError={projectsError}
                issuesLoading={issuesLoading}
                issuesError={issuesError}
                onOpenCreateProject={handleOpenCreateProject}
                onProjectSelect={handleProjectSelect}
                onOpenIssueDetails={handleOpenIssueDetails}
              />
            ) : null}

            {isBacklogView && !activeIssueKey ? (
              <BacklogView
                t={t}
                projectName={activeProject?.name || ''}
                sprints={sprints}
                issueItems={issueItems}
                backlogLoading={backlogLoading}
                issuesLoading={issuesLoading}
                issuesError={issuesError}
                activeLocale={activeLocale}
                usersById={usersById}
                onOpenIssueDetails={handleOpenIssueDetails}
                onOpenCreateSprint={handleOpenCreateSprint}
                onStartSprint={handleStartSprint}
                onCompleteSprint={handleCompleteSprint}
                onMoveIssue={handleMoveIssueToSprint}
                onEditSprint={handleEditSprint}
              />
            ) : null}

            {isTeamView ? (
              <TeamPanel
                t={t}
                activeProject={activeProject}
                inviteSearch={inviteSearch}
                setInviteSearch={setInviteSearch}
                inviteRole={inviteRole}
                setInviteRole={setInviteRole}
                inviteResults={inviteResults}
                inviteLoading={inviteLoading}
                inviteError={inviteError}
                members={members}
                membersLoading={membersLoading}
                membersError={membersError}
                usersById={usersById}
                onInviteMember={handleInviteMember}
                onRemoveMember={handleRemoveMember}
              />
            ) : null}

            {isBoardView && !activeIssueKey && activeSideLink === 'board' ? (
              <BoardPanel
                t={t}
                boardDetail={boardDetail}
                kanbanColumns={kanbanColumns}
                boardDoneCount={boardDoneCount}
                boardTaskTotal={boardTaskTotal}
                boardCompletion={boardCompletion}
                dropColumnID={dropColumnID}
                dragState={dragState}
                activeLocale={activeLocale}
                usersById={usersById}
                onCardDragStart={handleCardDragStart}
                onCardDragEnd={handleCardDragEnd}
                onColumnDragOver={handleColumnDragOver}
                onColumnDrop={handleColumnDrop}
                onOpenIssueDetails={handleOpenIssueDetails}
              />
            ) : null}

            {isBoardView && !activeIssueKey && activeSideLink === 'issues' ? (
              <IssuesPage
                t={t}
                projectName={activeProject?.name || ''}
                issues={issueItems}
                selectedIssueKey={selectedProjectIssueKey}
                active={location.pathname.startsWith('/home/projects/issues')}
                onSelectIssue={handleSelectProjectIssue}
                onOpenCreateIssue={handleOpenCreateIssue}
                issuesLoading={issuesLoading}
                issuesError={issuesError}
                locale={activeLocale}
                members={members}
                usersById={usersById}
              />
            ) : null}

            {isBoardView && !activeIssueKey && activeSideLink === 'reports' ? (
              <ReportsPanel
                t={t}
                projectName={activeProject?.name || ''}
                issues={issueItems}
                issuesTotal={Number(issuesData?.total ?? issueItems.length)}
                issuesLoading={issuesLoading}
                issuesError={issuesError}
                activeLocale={activeLocale}
                usersById={usersById}
                onOpenIssueDetails={handleOpenIssueDetails}
              />
            ) : null}

            {isBoardView && !activeIssueKey && activeSideLink === 'archive' ? (
              <ArchivePanel
                t={t}
                projectName={activeProject?.name || ''}
                issues={issueItems}
                issuesLoading={issuesLoading}
                issuesError={issuesError}
                activeLocale={activeLocale}
                usersById={usersById}
                onOpenIssueDetails={handleOpenIssueDetails}
              />
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
  if (token) return <Navigate to="/home/dashboard" replace />
  return children
}

function AppFallback() {
  const { token } = useAuth()
  return <Navigate to={token ? '/home/dashboard' : '/login'} replace />
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
          path="/home/*"
          element={(
            <RequireAuth>
              <Kanban />
            </RequireAuth>
          )}
        />

        <Route
          path="/profile"
          element={(
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          )}
        />

        <Route path="*" element={<AppFallback />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
