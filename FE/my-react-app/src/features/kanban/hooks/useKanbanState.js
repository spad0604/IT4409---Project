import { useRef, useState } from 'react'

export function useKanbanState() {
  const [activeTopTab, setActiveTopTab] = useState('dashboard')
  const [activeSideLink, setActiveSideLink] = useState('overview')

  const [activeIssueKey, setActiveIssueKey] = useState('')
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
  const [newIssueAssigneeId, setNewIssueAssigneeId] = useState('')
  const [newIssueSprintId, setNewIssueSprintId] = useState('')
  const [newIssueLabels, setNewIssueLabels] = useState([])
  const [createIssueCreateAnother, setCreateIssueCreateAnother] = useState(false)

  const [sprints, setSprints] = useState([])
  const [sprintsLoading, setSprintsLoading] = useState(false)
  const [sprintsError, setSprintsError] = useState('')
  const [activeSprint, setActiveSprint] = useState(null)
  const [showCreateSprint, setShowCreateSprint] = useState(false)
  const [createSprintLoading, setCreateSprintLoading] = useState(false)
  const [createSprintError, setCreateSprintError] = useState('')
  const [newSprintName, setNewSprintName] = useState('')
  const [newSprintDescription, setNewSprintDescription] = useState('')
  const [backlogIssues, setBacklogIssues] = useState([])
  const [backlogLoading, setBacklogLoading] = useState(false)

  const [activityLog, setActivityLog] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')

  const wsClientRef = useRef(null)
  const [usersById, setUsersById] = useState({})
  const userFetchInFlight = useRef(new Map())

  return {
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
    headerSearch,
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
    sprintsLoading,
    setSprintsLoading,
    sprintsError,
    setSprintsError,
    activeSprint,
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
    backlogIssues,
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
  }
}
