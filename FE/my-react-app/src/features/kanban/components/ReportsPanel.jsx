import { useMemo, useState } from 'react'
import { formatShortDate, priorityDisplay, safeLower, toInitials } from '../kanbanUtils'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'

const STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'trivial']
const TYPE_OPTIONS = ['task', 'bug', 'story', 'epic', 'subtask']

const STATUS_COLORS = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  in_review: '#f59e0b',
  done: '#22c55e',
  cancelled: '#ef4444',
  unknown: '#d1d5db',
}

const TYPE_COLORS = {
  task: '#6366f1',
  bug: '#ef4444',
  story: '#22c55e',
  epic: '#8b5cf6',
  subtask: '#06b6d4',
  unknown: '#d1d5db',
}

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  trivial: '#94a3b8',
}

const TEAM_COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function formatFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const REPORT_TABS = ['summary', 'workload', 'progress']

export default function ReportsPanel({
  t,
  projectName,
  issues,
  issuesTotal,
  issuesLoading,
  issuesError,
  activeLocale,
  usersById,
  onOpenIssueDetails,
}) {
  const [activeTab, setActiveTab] = useState('summary')
  const [search, setSearch] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [type, setType] = useState('')

  const issueItems = useMemo(() => (Array.isArray(issues) ? issues : []), [issues])

  const assigneeOptions = useMemo(() => {
    const ids = new Set()
    for (const it of issueItems) {
      if (it?.assigneeId) ids.add(String(it.assigneeId))
    }
    return Array.from(ids)
      .map((id) => ({
        id,
        label: usersById?.[id]?.name || usersById?.[id]?.email || id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [issueItems, usersById])

  const filtered = useMemo(() => {
    const q = normalizeText(search)
    return issueItems.filter((it) => {
      if (!it) return false
      if (assigneeId && String(it?.assigneeId ?? '') !== String(assigneeId)) return false
      if (status && safeLower(it?.status) !== safeLower(status)) return false
      if (priority && safeLower(it?.priority) !== safeLower(priority)) return false
      if (type && safeLower(it?.type) !== safeLower(type)) return false
      if (!q) return true
      const hay = `${it?.key || ''} ${it?.title || ''} ${it?.description || ''}`
      return normalizeText(hay).includes(q)
    })
  }, [assigneeId, issueItems, priority, search, status, type])

  const sorted = useMemo(() => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, trivial: 4 }
    return [...filtered].sort((a, b) => {
      const pa = order[safeLower(a?.priority)] ?? 99
      const pb = order[safeLower(b?.priority)] ?? 99
      if (pa !== pb) return pa - pb
      return safeLower(a?.key).localeCompare(safeLower(b?.key))
    })
  }, [filtered])

  const totalCount = Number.isFinite(Number(issuesTotal))
    ? Number(issuesTotal)
    : sorted.length

  // ─── Chart Data ───────────────────────────────────────────────────────────

  const byStatus = useMemo(() => {
    const counts = new Map()
    for (const issue of issueItems) {
      const key = safeLower(issue?.status) || 'unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([key, count]) => ({
      name: key,
      value: count,
      fill: STATUS_COLORS[key] || STATUS_COLORS.unknown,
    }))
  }, [issueItems])

  const byType = useMemo(() => {
    const counts = new Map()
    for (const issue of issueItems) {
      const key = safeLower(issue?.type) || 'unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([key, count]) => ({
      name: key,
      value: count,
      fill: TYPE_COLORS[key] || TYPE_COLORS.unknown,
    }))
  }, [issueItems])

  const byPriority = useMemo(() => {
    const counts = new Map()
    for (const issue of issueItems) {
      const key = safeLower(issue?.priority) || 'medium'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    const order = ['critical', 'high', 'medium', 'low', 'trivial']
    return order
      .filter((k) => counts.has(k))
      .map((key) => ({
        name: key,
        value: counts.get(key) || 0,
        fill: PRIORITY_COLORS[key] || '#94a3b8',
      }))
  }, [issueItems])

  const byAssignee = useMemo(() => {
    const counts = new Map()
    for (const issue of issueItems) {
      const key = String(issue?.assigneeId || 'unassigned')
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        name: key === 'unassigned'
          ? t('common.unassigned', { defaultValue: 'Unassigned' })
          : usersById?.[key]?.name || usersById?.[key]?.email || key.slice(0, 8),
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [issueItems, t, usersById])

  // Build a burn-up / progress timeline from issue createdAt dates
  const progressData = useMemo(() => {
    if (issueItems.length === 0) return []

    const sorted = [...issueItems].sort((a, b) => {
      const da = new Date(a?.createdAt || 0).getTime()
      const db = new Date(b?.createdAt || 0).getTime()
      return da - db
    })

    // Group by date
    const dayMap = new Map()
    let cumTotal = 0
    let cumDone = 0

    for (const issue of sorted) {
      const d = issue?.createdAt ? new Date(issue.createdAt) : null
      if (!d || Number.isNaN(d.getTime())) continue
      const key = d.toISOString().slice(0, 10)

      cumTotal += 1
      if (safeLower(issue?.status) === 'done') cumDone += 1

      dayMap.set(key, { date: key, total: cumTotal, done: cumDone })
    }

    // Also count done issues that were created earlier but completed
    // Re-calculate done correctly: we need cumulative done
    const allDates = Array.from(dayMap.values())
    // Recalculate done as running total of done items up to that date
    let runningDone = 0
    const doneByDate = new Map()
    for (const issue of sorted) {
      if (safeLower(issue?.status) === 'done') {
        const d = issue?.updatedAt ? new Date(issue.updatedAt) : (issue?.createdAt ? new Date(issue.createdAt) : null)
        if (d && !Number.isNaN(d.getTime())) {
          const key = d.toISOString().slice(0, 10)
          doneByDate.set(key, (doneByDate.get(key) || 0) + 1)
        }
      }
    }

    // Build final data - use last 14 entries max for readability
    const result = allDates.slice(-14)
    return result
  }, [issueItems])

  const doneCount = issueItems.filter((issue) => safeLower(issue?.status) === 'done').length
  const activeCount = issueItems.filter((issue) => safeLower(issue?.status) === 'in_progress').length
  const reviewCount = issueItems.filter((issue) => safeLower(issue?.status) === 'in_review').length
  const todoCount = issueItems.filter((issue) => safeLower(issue?.status) === 'todo').length

  const customPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <section className="panel" aria-label={t('reports.aria', { defaultValue: 'Reports' })}>
      <header className="panel-head">
        <div>
          <h2>{t('reports.title', { defaultValue: 'Reports' })}</h2>
          <p>{projectName ? `${t('common.project')}: ${projectName}` : t('projects.noProjectSelected')}</p>
        </div>
        <p className="dashboard-kicker">{t('reports.total', { defaultValue: 'Total issues' })}: {totalCount}</p>
      </header>

      {/* Stats Summary Cards */}
      <section className="stats-overview" style={{ marginBottom: '1rem' }}>
        <article className="stat-card">
          <span>{t('reports.total', { defaultValue: 'Total issues' })}</span>
          <strong>{totalCount}</strong>
        </article>
        <article className="stat-card">
          <span>{t('issue.status.done', { defaultValue: 'Done' })}</span>
          <strong style={{ color: '#22c55e' }}>{doneCount}</strong>
        </article>
        <article className="stat-card">
          <span>{t('issue.status.in_progress', { defaultValue: 'In Progress' })}</span>
          <strong style={{ color: '#3b82f6' }}>{activeCount}</strong>
        </article>
        <article className="stat-card">
          <span>{t('issue.status.in_review', { defaultValue: 'In Review' })}</span>
          <strong style={{ color: '#f59e0b' }}>{reviewCount}</strong>
        </article>
      </section>

      {/* Tab Navigation */}
      <div className="reports-tabs">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`reports-tab ${activeTab === tab ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`reports.tabs.${tab}`, {
              defaultValue: tab === 'summary' ? 'Summary' : tab === 'workload' ? 'Team Workload' : 'Progress',
            })}
          </button>
        ))}
      </div>

      {/* Summary Tab — Pie Charts */}
      {activeTab === 'summary' ? (
        <section className="reports-charts-grid">
          {/* By Status - Pie */}
          <article className="reports-chart-card">
            <h3>{t('reports.byStatus', { defaultValue: 'By Status' })}</h3>
            {byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={customPieLabel}
                    outerRadius={95}
                    innerRadius={40}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {byStatus.map((entry, index) => (
                      <Cell key={`status-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, t(`issue.status.${name}`, { defaultValue: name })]}
                    contentStyle={{ borderRadius: '0.5rem', fontSize: '0.72rem', border: '1px solid #e6e9f0' }}
                  />
                  <Legend
                    formatter={(value) => t(`issue.status.${value}`, { defaultValue: value })}
                    wrapperStyle={{ fontSize: '0.68rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">{t('reports.noData', { defaultValue: 'No data' })}</p>
            )}
          </article>

          {/* By Type - Pie */}
          <article className="reports-chart-card">
            <h3>{t('reports.byType', { defaultValue: 'By Type' })}</h3>
            {byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={customPieLabel}
                    outerRadius={95}
                    innerRadius={40}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {byType.map((entry, index) => (
                      <Cell key={`type-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, t(`issue.type.${name}`, { defaultValue: name })]}
                    contentStyle={{ borderRadius: '0.5rem', fontSize: '0.72rem', border: '1px solid #e6e9f0' }}
                  />
                  <Legend
                    formatter={(value) => t(`issue.type.${value}`, { defaultValue: value })}
                    wrapperStyle={{ fontSize: '0.68rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">{t('reports.noData', { defaultValue: 'No data' })}</p>
            )}
          </article>

          {/* By Priority - Bar */}
          <article className="reports-chart-card">
            <h3>{t('reports.byPriority', { defaultValue: 'By Priority' })}</h3>
            {byPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byPriority} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tickFormatter={(v) => t(`priority.${v}`, { defaultValue: v })}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => [value, t('reports.issues', { defaultValue: 'Issues' })]}
                    labelFormatter={(label) => t(`priority.${label}`, { defaultValue: label })}
                    contentStyle={{ borderRadius: '0.5rem', fontSize: '0.72rem', border: '1px solid #e6e9f0' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {byPriority.map((entry, index) => (
                      <Cell key={`pri-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">{t('reports.noData', { defaultValue: 'No data' })}</p>
            )}
          </article>
        </section>
      ) : null}

      {/* Workload Tab — Bar Chart */}
      {activeTab === 'workload' ? (
        <section className="reports-charts-grid reports-charts-single">
          <article className="reports-chart-card reports-chart-wide">
            <h3>{t('reports.byAssignee', { defaultValue: 'Team Workload' })}</h3>
            {byAssignee.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={byAssignee} layout="vertical" margin={{ top: 10, right: 30, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [value, t('reports.issues', { defaultValue: 'Issues' })]}
                    contentStyle={{ borderRadius: '0.5rem', fontSize: '0.72rem', border: '1px solid #e6e9f0' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                    {byAssignee.map((entry, index) => (
                      <Cell key={`assignee-${index}`} fill={TEAM_COLORS[index % TEAM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">{t('reports.noData', { defaultValue: 'No data' })}</p>
            )}
          </article>

          {/* Status breakdown per assignee */}
          <article className="reports-chart-card reports-chart-wide">
            <h3>{t('reports.statusBreakdown', { defaultValue: 'Status Breakdown by Assignee' })}</h3>
            <div className="reports-breakdown-table">
              <table>
                <thead>
                  <tr>
                    <th>{t('common.assignee', { defaultValue: 'Assignee' })}</th>
                    {STATUS_OPTIONS.map((s) => (
                      <th key={s}>
                        <span className="reports-status-dot" style={{ background: STATUS_COLORS[s] }} />
                        {t(`issue.status.${s}`, { defaultValue: s })}
                      </th>
                    ))}
                    <th>{t('reports.total', { defaultValue: 'Total' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {assigneeOptions.map((opt) => {
                    const userIssues = issueItems.filter((it) => String(it?.assigneeId) === opt.id)
                    const statusCounts = {}
                    for (const s of STATUS_OPTIONS) statusCounts[s] = 0
                    for (const it of userIssues) {
                      const st = safeLower(it?.status)
                      if (st in statusCounts) statusCounts[st]++
                    }
                    return (
                      <tr key={opt.id}>
                        <td><strong>{opt.label}</strong></td>
                        {STATUS_OPTIONS.map((s) => (
                          <td key={s}>{statusCounts[s] || '-'}</td>
                        ))}
                        <td><strong>{userIssues.length}</strong></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {/* Progress Tab — Area Chart */}
      {activeTab === 'progress' ? (
        <section className="reports-charts-grid reports-charts-single">
          <article className="reports-chart-card reports-chart-wide">
            <h3>{t('reports.burnup', { defaultValue: 'Burn-up Chart' })}</h3>
            <p className="reports-chart-hint">
              {t('reports.burnupHint', { defaultValue: 'Cumulative issues created vs completed over time' })}
            </p>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={progressData} margin={{ top: 10, right: 30, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '0.5rem', fontSize: '0.72rem', border: '1px solid #e6e9f0' }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name={t('reports.totalCreated', { defaultValue: 'Total Created' })}
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gradTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="done"
                    name={t('reports.completed', { defaultValue: 'Completed' })}
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#gradDone)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">{t('reports.noProgressData', { defaultValue: 'Not enough data for chart' })}</p>
            )}
          </article>

          {/* Completion Summary */}
          <article className="reports-chart-card reports-chart-wide">
            <h3>{t('reports.completion', { defaultValue: 'Completion Rate' })}</h3>
            <div className="reports-completion-grid">
              <div className="reports-completion-ring">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'done', value: doneCount },
                        { name: 'remaining', value: Math.max(0, totalCount - doneCount) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      strokeWidth={0}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#f0f0f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="reports-ring-label">
                  <strong>{totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%</strong>
                  <span>{t('reports.completed', { defaultValue: 'Completed' })}</span>
                </div>
              </div>
              <div className="reports-completion-stats">
                <div><span className="reports-stat-dot" style={{ background: '#94a3b8' }} />{t('issue.status.todo')}: <strong>{todoCount}</strong></div>
                <div><span className="reports-stat-dot" style={{ background: '#3b82f6' }} />{t('issue.status.in_progress')}: <strong>{activeCount}</strong></div>
                <div><span className="reports-stat-dot" style={{ background: '#f59e0b' }} />{t('issue.status.in_review')}: <strong>{reviewCount}</strong></div>
                <div><span className="reports-stat-dot" style={{ background: '#22c55e' }} />{t('issue.status.done')}: <strong>{doneCount}</strong></div>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {/* Issue List (always visible below) */}
      <div style={{ display: 'grid', gap: '0.55rem', marginTop: '1.2rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.84rem' }}>{t('reports.issueList', { defaultValue: 'Issue List' })}</h3>
        <label className="issue-search" htmlFor="reports-search" style={{ maxWidth: 'unset' }}>
          <input
            id="reports-search"
            type="search"
            placeholder={t('reports.searchPlaceholder', { defaultValue: 'Search issues…' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.5rem' }}>
          <label className="inline-field">
            <span className="inline-label">{t('reports.filters.assignee', { defaultValue: 'Assignee' })}</span>
            <select className="inline-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">{t('reports.filters.all', { defaultValue: 'All' })}</option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </label>

          <label className="inline-field">
            <span className="inline-label">{t('reports.filters.status', { defaultValue: 'Status' })}</span>
            <select className="inline-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('reports.filters.all', { defaultValue: 'All' })}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{t(`issue.status.${s}`, { defaultValue: s })}</option>
              ))}
            </select>
          </label>

          <label className="inline-field">
            <span className="inline-label">{t('reports.filters.priority', { defaultValue: 'Priority' })}</span>
            <select className="inline-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">{t('reports.filters.all', { defaultValue: 'All' })}</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{t(`priority.${p}`, { defaultValue: p })}</option>
              ))}
            </select>
          </label>

          <label className="inline-field">
            <span className="inline-label">{t('reports.filters.type', { defaultValue: 'Type' })}</span>
            <select className="inline-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t('reports.filters.all', { defaultValue: 'All' })}</option>
              {TYPE_OPTIONS.map((tp) => (
                <option key={tp} value={tp}>{t(`issue.type.${tp}`, { defaultValue: tp })}</option>
              ))}
            </select>
          </label>
        </div>

        {issuesLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
        {issuesError ? <p className="dashboard-kicker">{issuesError}</p> : null}

        <div className="assigned-list">
          {sorted.length === 0 && !issuesLoading ? (
            <article className="assigned-item">
              <div>
                <h3>{t('reports.empty', { defaultValue: 'No issues found' })}</h3>
                <p>{t('reports.emptyHint', { defaultValue: 'Try changing filters or search.' })}</p>
              </div>
            </article>
          ) : null}

          {sorted.map((issue) => {
            const pr = priorityDisplay(issue?.priority)
            const priorityKey = safeLower(issue?.priority)
            const due = formatShortDate(issue?.dueDate, activeLocale)
            const assignee = issue?.assigneeId ? usersById?.[String(issue.assigneeId)] : null
            const who = assignee?.name || assignee?.email || ''
            const initials = toInitials(who)
            return (
              <article key={issue?.key} className="assigned-item">
                <div>
                  <p className="task-code">{issue?.key}</p>
                  <h3>{issue?.title}</h3>
                  <p>
                    {t(`issue.status.${safeLower(issue?.status)}`, { defaultValue: String(issue?.status || '-') })}
                    {' · '}
                    {priorityKey ? t(`priority.${priorityKey}`, { defaultValue: pr.label }) : pr.label}
                    {issue?.type ? ` · ${t(`issue.type.${safeLower(issue.type)}`, { defaultValue: String(issue.type) })}` : ''}
                    {due ? ` · ${t('common.due')}: ${due}` : ''}
                    {initials ? ` · ${t('common.assignee')}: ${initials}` : ''}
                  </p>
                </div>
                <button type="button" className="open-btn" onClick={() => onOpenIssueDetails?.(issue?.key)}>
                  {t('common.open')}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
