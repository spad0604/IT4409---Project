export default function FilterBar({
  t,
  filters,
  onChange,
  onClear,
  members = [],
  labels = [],
  sprints = [],
  usersById = {},
}) {
  const update = (key, value) => onChange?.({ ...filters, [key]: value })

  return (
    <section className="panel" aria-label={t('filters.title', { defaultValue: 'Issue filters' })}>
      <div className="filter-grid">
        <label className="inline-field">
          <span className="inline-label">{t('common.search', { defaultValue: 'Search' })}</span>
          <input
            className="inline-input"
            type="search"
            value={filters?.search || ''}
            onChange={(e) => update('search', e.target.value)}
            placeholder={t('filters.searchPlaceholder', { defaultValue: 'Search by key or title...' })}
          />
        </label>

        <label className="inline-field">
          <span className="inline-label">{t('issues.detail.status', { defaultValue: 'Status' })}</span>
          <select className="inline-select" value={filters?.status || ''} onChange={(e) => update('status', e.target.value)}>
            <option value="">{t('common.all', { defaultValue: 'All' })}</option>
            {['todo', 'in_progress', 'in_review', 'done', 'cancelled'].map((value) => (
              <option key={value} value={value}>{t(`issue.status.${value}`, { defaultValue: value })}</option>
            ))}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-label">{t('issues.detail.type', { defaultValue: 'Type' })}</span>
          <select className="inline-select" value={filters?.type || ''} onChange={(e) => update('type', e.target.value)}>
            <option value="">{t('common.all', { defaultValue: 'All' })}</option>
            {['task', 'bug', 'story', 'epic', 'subtask'].map((value) => (
              <option key={value} value={value}>{t(`issue.type.${value}`, { defaultValue: value })}</option>
            ))}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-label">{t('issues.detail.priority', { defaultValue: 'Priority' })}</span>
          <select className="inline-select" value={filters?.priority || ''} onChange={(e) => update('priority', e.target.value)}>
            <option value="">{t('common.all', { defaultValue: 'All' })}</option>
            {['critical', 'high', 'medium', 'low', 'trivial'].map((value) => (
              <option key={value} value={value}>{t(`priority.${value}`, { defaultValue: value })}</option>
            ))}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-label">{t('issues.detail.assignee', { defaultValue: 'Assignee' })}</span>
          <select className="inline-select" value={filters?.assignee || ''} onChange={(e) => update('assignee', e.target.value)}>
            <option value="">{t('common.all', { defaultValue: 'All' })}</option>
            <option value="none">{t('common.unassigned', { defaultValue: 'Unassigned' })}</option>
            {members.map((member) => {
              const id = String(member?.userId ?? member?.id ?? '')
              const label = usersById?.[id]?.name || usersById?.[id]?.email || id
              return <option key={id} value={id}>{label}</option>
            })}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-label">{t('issues.detail.labels', { defaultValue: 'Labels' })}</span>
          <select className="inline-select" value={filters?.label || ''} onChange={(e) => update('label', e.target.value)}>
            <option value="">{t('common.all', { defaultValue: 'All' })}</option>
            {labels.map((label) => (
              <option key={label?.id} value={label?.id}>{label?.name}</option>
            ))}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-label">{t('issues.detail.sprint', { defaultValue: 'Sprint' })}</span>
          <select className="inline-select" value={filters?.sprint || ''} onChange={(e) => update('sprint', e.target.value)}>
            <option value="">{t('common.all', { defaultValue: 'All' })}</option>
            <option value="backlog">{t('backlog.title', { defaultValue: 'Backlog' })}</option>
            {sprints.map((sprint) => (
              <option key={sprint?.id} value={sprint?.id}>{sprint?.name}</option>
            ))}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-label">{t('issues.detail.reporter', { defaultValue: 'Reporter' })}</span>
          <select className="inline-select" value={filters?.reporter || ''} onChange={(e) => update('reporter', e.target.value)}>
            <option value="">{t('common.all', { defaultValue: 'All' })}</option>
            {members.map((member) => {
              const id = String(member?.userId ?? member?.id ?? '')
              const label = usersById?.[id]?.name || usersById?.[id]?.email || id
              return <option key={`reporter-${id}`} value={id}>{label}</option>
            })}
          </select>
        </label>
      </div>

      <div className="modal-actions" style={{ marginTop: '0.85rem' }}>
        <button type="button" className="filter-btn" onClick={onClear}>
          {t('filters.clear', { defaultValue: 'Clear all filters' })}
        </button>
      </div>
    </section>
  )
}
