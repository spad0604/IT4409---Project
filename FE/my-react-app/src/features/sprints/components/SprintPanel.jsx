function formatDate(value, locale) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit' }).format(date)
}

export default function SprintPanel({
  t,
  sprint,
  issues = [],
  activeLocale,
  onStartSprint,
  onCompleteSprint,
  onEditSprint,
}) {
  const doneCount = issues.filter((issue) => String(issue?.status || '').toLowerCase() === 'done').length
  const totalCount = issues.length
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const isPlanning = String(sprint?.status || '').toLowerCase() === 'planning'
  const isActive = String(sprint?.status || '').toLowerCase() === 'active'

  return (
    <section className="panel sprint-panel-card">
      <header className="panel-head">
        <div>
          <h2>{sprint?.name || t('sprints.title', { defaultValue: 'Sprint' })}</h2>
          <p>{t(`sprints.status.${String(sprint?.status || '').toLowerCase()}`, { defaultValue: sprint?.status || '' })}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="filter-btn" onClick={() => onEditSprint?.(sprint)}>
            {t('common.edit')}
          </button>
          {isPlanning ? (
            <button type="button" className="open-btn" onClick={() => onStartSprint?.(sprint?.id)}>
              {t('sprints.start', { defaultValue: 'Start sprint' })}
            </button>
          ) : null}
          {isActive ? (
            <button type="button" className="open-btn" onClick={() => onCompleteSprint?.(sprint?.id)}>
              {t('sprints.complete', { defaultValue: 'Complete sprint' })}
            </button>
          ) : null}
        </div>
      </header>

      <div className="sprint-panel-meta">
        <p>{t('sprints.goal', { defaultValue: 'Goal' })}: {sprint?.goal || t('common.noDescription')}</p>
        <p>
          {t('sprints.range', { defaultValue: 'Range' })}: {formatDate(sprint?.startDate, activeLocale) || '-'} - {formatDate(sprint?.endDate, activeLocale) || '-'}
        </p>
        <p>{t('sprints.progress', { defaultValue: 'Progress' })}: {doneCount}/{totalCount} ({progress}%)</p>
      </div>

      <div className="progress-track" aria-hidden="true" style={{ marginTop: '0.6rem' }}>
        <span style={{ width: `${progress}%` }} />
      </div>
    </section>
  )
}
