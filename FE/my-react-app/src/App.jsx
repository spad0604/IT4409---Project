import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./features/auth/pages/Login";

function Kanban() {
  const { t, i18n } = useTranslation()
  const [activeTopTab, setActiveTopTab] = useState('projects')
  const [activeSideItem, setActiveSideItem] = useState('overview')

  const activeLang = useMemo(() => {
    const current = i18n.resolvedLanguage || i18n.language || 'vi'
    return current.startsWith('vi') ? 'vi' : 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const topTabs = t('boardShell.topTabs', { returnObjects: true })
  const sideLinks = t('boardShell.sideLinks', { returnObjects: true })

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
  }

  return (
    <div className="screen-wrap">
      <p className="screen-caption">{t('boardShell.screenLabel')}</p>

      <section className="kanban-shell" data-enter>
        <header className="kanban-topbar">
          <p className="workspace-name">{t('boardShell.workspaceName')}</p>

          <nav className="top-tabs" aria-label={t('boardShell.topNavLabel')}>
            {topTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`top-tab ${activeTopTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTopTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="topbar-tools">
            <label className="search-box" htmlFor="issue-search">
              <span aria-hidden="true">⌕</span>
              <input id="issue-search" type="search" placeholder={t('boardShell.searchPlaceholder')} />
            </label>
            <button type="button" className="icon-button" aria-label={t('boardShell.notifications')}>
              ●
            </button>
            <button type="button" className="icon-button" aria-label={t('boardShell.settings')}>
              ●
            </button>
            <button type="button" className="create-issue-button">
              {t('boardShell.createIssue')}
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

        <div className="kanban-body">
          <aside className="side-nav" aria-label={t('boardShell.sideNavLabel')}>
            <div className="team-card">
              <div className="team-badge">CP</div>
              <div>
                <p className="team-name">{t('boardShell.teamName')}</p>
                <p className="team-type">{t('boardShell.teamType')}</p>
              </div>
            </div>

            <nav className="side-links">
              {sideLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className={`side-link ${activeSideItem === link.id ? 'is-active' : ''}`}
                  onClick={() => setActiveSideItem(link.id)}
                >
                  <span className="side-icon" aria-hidden="true"></span>
                  {link.label}
                </button>
              ))}
            </nav>

            <button type="button" className="invite-button">
              {t('boardShell.inviteMember')}
            </button>

            <div className="side-footer-links">
              <button type="button" className="footer-link">{t('boardShell.help')}</button>
              <button type="button" className="footer-link">{t('boardShell.feedback')}</button>
            </div>
          </aside>

          <section className="content-region">
            <header className="content-header">
              <h1>{t('boardShell.contentTitle')}</h1>
              <p>{t('boardShell.contentSubtitle')}</p>
            </header>

            <section className="content-placeholder" aria-label={t('boardShell.pagePlaceholder')}>
              <p>{t('boardShell.pagePlaceholder')}</p>
            </section>
          </section>
        </div>
        <button type="button" className="floating-action">
          {t('boardShell.quickActions')}
        </button>
      </section>
    </div>
  )

}


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect từ / → /login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Main app */}
        <Route path="/home" element={<Kanban />} />
      </Routes>
    </BrowserRouter>
  );

}

export default App
