import { useEffect, useState } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import * as searchApi from '../../features/search/api/searchApi'

export default function GlobalSearch({
  t,
  open,
  onClose,
  projectId,
  onOpenIssueDetails,
  onOpenProject,
}) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ issues: [], projects: [] })

  useEffect(() => {
    if (!open) return
    const trimmed = String(query ?? '').trim()
    if (!trimmed) return

    const handle = window.setTimeout(() => {
      setLoading(true)
      searchApi.search({ q: trimmed, projectId })
        .then((data) => {
          setResults({
            issues: Array.isArray(data?.issues) ? data.issues : [],
            projects: Array.isArray(data?.projects) ? data.projects : [],
          })
        })
        .catch(() => {
          setResults({ issues: [], projects: [] })
        })
        .finally(() => setLoading(false))
    }, 250)

    return () => window.clearTimeout(handle)
  }, [open, projectId, query])

  const visibleResults = String(query ?? '').trim() ? results : { issues: [], projects: [] }
  const totalResults = (visibleResults.issues?.length || 0) + (visibleResults.projects?.length || 0)

  const handleClose = () => {
    setQuery('')
    setResults({ issues: [], projects: [] })
    setLoading(false)
    onClose?.()
  }

  if (!open) return null

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={handleClose}>
      <div className="modal global-search-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>{t('search.title', { defaultValue: 'Global search' })}</h2>
            <p>{t('search.subtitle', { defaultValue: 'Search issues and projects' })}</p>
          </div>
          <button type="button" className="icon-btn" onClick={handleClose} aria-label={t('common.close')}>
            <FiX />
          </button>
        </header>

        <div className="modal-body">
          <label className="issue-search" htmlFor="global-search-input" style={{ maxWidth: 'unset' }}>
            <FiSearch className="issue-search-icon" aria-hidden="true" />
            <input
              id="global-search-input"
              type="search"
              placeholder={t('search.placeholder', { defaultValue: 'Search issues, projects...' })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </label>

          {loading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
          {!loading && query && totalResults === 0 ? (
            <p className="dashboard-kicker">{t('search.empty', { defaultValue: 'No results found' })}</p>
          ) : null}

          {visibleResults.issues?.length > 0 ? (
            <section className="assigned panel" style={{ marginTop: '0.75rem' }}>
              <header className="panel-head">
                <h2>{t('search.issues', { defaultValue: 'Issues' })}</h2>
              </header>
              <div className="assigned-list">
                {visibleResults.issues.map((issue) => (
                  <article key={issue?.id || issue?.key} className="assigned-item">
                    <div>
                      <p className="task-code">{issue?.key}</p>
                      <h3>{issue?.title}</h3>
                    </div>
                    <button type="button" className="open-btn" onClick={() => {
                      onOpenIssueDetails?.(issue?.key)
                      handleClose()
                    }}>
                      {t('common.open')}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {visibleResults.projects?.length > 0 ? (
            <section className="assigned panel" style={{ marginTop: '0.75rem' }}>
              <header className="panel-head">
                <h2>{t('search.projects', { defaultValue: 'Projects' })}</h2>
              </header>
              <div className="assigned-list">
                {visibleResults.projects.map((project) => (
                  <article key={project?.id} className="assigned-item">
                    <div>
                      <p className="task-code">{project?.key}</p>
                      <h3>{project?.name}</h3>
                      <p>{project?.description || ''}</p>
                    </div>
                    <button type="button" className="open-btn" onClick={() => {
                      onOpenProject?.(project?.id)
                      handleClose()
                    }}>
                      {t('common.open')}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
