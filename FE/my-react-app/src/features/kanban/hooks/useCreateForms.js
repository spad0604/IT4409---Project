import { useState } from 'react'

export function useCreateForms() {
  // Create Project
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [createProjectLoading, setCreateProjectLoading] = useState(false)
  const [createProjectError, setCreateProjectError] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectKey, setNewProjectKey] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectType, setNewProjectType] = useState('kanban')

  // Create Issue
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

  // Create Sprint
  const [showCreateSprint, setShowCreateSprint] = useState(false)
  const [createSprintLoading, setCreateSprintLoading] = useState(false)
  const [createSprintError, setCreateSprintError] = useState('')
  const [newSprintName, setNewSprintName] = useState('')
  const [newSprintDescription, setNewSprintDescription] = useState('')

  return {
    // Project
    showCreateProject,
    createProjectLoading,
    createProjectError,
    newProjectName,
    newProjectKey,
    newProjectDescription,
    newProjectType,
    setShowCreateProject,
    setCreateProjectLoading,
    setCreateProjectError,
    setNewProjectName,
    setNewProjectKey,
    setNewProjectDescription,
    setNewProjectType,

    // Issue
    showCreateIssue,
    createIssueLoading,
    createIssueError,
    newIssueProjectId,
    newIssueType,
    newIssuePriority,
    newIssueTitle,
    newIssueDescription,
    newIssueAssigneeId,
    newIssueSprintId,
    newIssueLabels,
    createIssueCreateAnother,
    setShowCreateIssue,
    setCreateIssueLoading,
    setCreateIssueError,
    setNewIssueProjectId,
    setNewIssueType,
    setNewIssuePriority,
    setNewIssueTitle,
    setNewIssueDescription,
    setNewIssueAssigneeId,
    setNewIssueSprintId,
    setNewIssueLabels,
    setCreateIssueCreateAnother,

    // Sprint
    showCreateSprint,
    createSprintLoading,
    createSprintError,
    newSprintName,
    newSprintDescription,
    setShowCreateSprint,
    setCreateSprintLoading,
    setCreateSprintError,
    setNewSprintName,
    setNewSprintDescription,
  }
}
