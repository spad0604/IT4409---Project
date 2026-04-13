import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StatsOverview } from './shared/components/stats-overview/StatsOverview.jsx'
import './App.css'

function App() {
  const { t, i18n } = useTranslation()

  const activeLang = useMemo(() => {
    const current = i18n.resolvedLanguage || i18n.language || 'vi'
    return current.startsWith('vi') ? 'vi' : 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const cards = t('statsOverview.cards', { returnObjects: true })

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
  }

  return (
    <main className="app-shell">
      <header className="app-toolbar" data-enter>
        <div className="toolbar-title-group">
          <p className="toolbar-kicker">{t('statsOverview.kicker')}</p>
          <h1 className="toolbar-title">{t('statsOverview.title')}</h1>
        </div>

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
      </header>

      <StatsOverview cards={cards} label={t('statsOverview.ariaLabel')} />
    </main>
  )
}

export default App
