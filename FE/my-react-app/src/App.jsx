import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'

function App() {
  const { t, i18n } = useTranslation()

  const activeLang = useMemo(() => {
    const current = i18n.resolvedLanguage || i18n.language || 'vi'
    return current.startsWith('vi') ? 'vi' : 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const metricCards = t('metrics.cards', { returnObjects: true })
  const tasks = t('tasks', { returnObjects: true })
  const focusItems = t('focus.items', { returnObjects: true })

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
  }

  return (
    <div className="page-shell">
      <header className="glass-nav" data-enter>
        <div className="brand-block">
          <p className="brand-kicker">{t('nav.systemName')}</p>
          <p className="brand-name">{t('nav.projectName')}</p>
        </div>
        <div className="nav-actions">
          <button type="button" className="action-chip">
            {t('nav.newBoard')}
          </button>
          <div className="language-switch" role="group" aria-label={t('nav.language')}>
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
        </div>
      </header>

      <main className="editorial-layout">
        <section className="lead-column panel-low" data-enter>
          <p className="kicker">{t('hero.kicker')}</p>
          <h1>{t('hero.title')}</h1>
          <p className="hero-description">{t('hero.description')}</p>

          <div className="metric-strip">
            {metricCards.map((item) => (
              <article key={item.label} className="metric-card">
                <p className="metric-label">{item.label}</p>
                <p className="metric-value">{item.value}</p>
                <p className="metric-delta">{item.delta}</p>
              </article>
            ))}
          </div>

          <div className="quick-add-bar" data-enter>
            <div>
              <p className="quick-add-title">{t('quickAdd.title')}</p>
              <p className="quick-add-subtitle">{t('quickAdd.subtitle')}</p>
            </div>
            <span className="tooltip-chip">{t('quickAdd.hint')}</span>
            <div className="quick-add-form">
              <input type="text" placeholder={t('quickAdd.placeholder')} aria-label={t('quickAdd.placeholder')} />
              <button type="button" className="primary-button">
                {t('quickAdd.button')}
              </button>
            </div>
          </div>
        </section>

        <aside className="focus-rail panel-paper" data-enter>
          <p className="kicker">{t('focus.kicker')}</p>
          <h2>{t('focus.title')}</h2>
          <ul className="focus-list">
            {focusItems.map((item) => (
              <li key={item.title} className="focus-item">
                <p className="focus-item-title">{item.title}</p>
                <p className="focus-item-meta">{item.meta}</p>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <section className="workbench panel-mid" data-enter>
        <div className="workbench-header">
          <div>
            <p className="kicker">{t('board.kicker')}</p>
            <h2>{t('board.title')}</h2>
            <p className="board-subtitle">{t('board.subtitle')}</p>
          </div>
          <div className="filters">
            <button type="button" className="filter-chip is-active">{t('filters.active')}</button>
            <button type="button" className="filter-chip">{t('filters.upcoming')}</button>
            <button type="button" className="filter-chip">{t('filters.review')}</button>
          </div>
        </div>

        <div className="task-grid">
          {tasks.map((task) => (
            <article key={task.title} className={`task-card ${task.priority === 'high' ? 'priority-high' : ''}`}>
              <div className="task-top-row">
                <p className="task-title">{task.title}</p>
                <span className="task-chip">{task.tag}</span>
              </div>

              <p className="task-meta">{task.owner}</p>

              <div className="progress-block">
                <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={task.progress}>
                  <span className="progress-fill" style={{ width: `${task.progress}%` }}></span>
                </div>
                <p className="progress-label">{task.progress}%</p>
              </div>

              <p className="task-due">{task.due}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default App
