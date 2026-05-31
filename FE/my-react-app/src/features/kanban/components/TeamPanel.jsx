import { FiSearch } from 'react-icons/fi'
import { safeLower, toInitials } from '../kanbanUtils'

export default function TeamPanel({
  t,
  activeProject,
  inviteSearch,
  setInviteSearch,
  inviteRole,
  setInviteRole,
  inviteResults,
  inviteLoading,
  inviteError,
  members,
  membersLoading,
  membersError,
  usersById,
  onInviteMember,
  onRemoveMember,
}) {
  return (
    <section className="placeholder-panel panel">
      <header className="panel-head">
        <h2>{t('team.title')}</h2>
        <p>{activeProject?.name ? `${t('common.project')}: ${activeProject.name}` : t('projects.noProjectSelected')}</p>
      </header>

      <div className="team-grid">
        <section className="team-section">
          <header className="panel-head">
            <h2>{t('team.invite.title')}</h2>
            <p>{t('team.invite.subtitle')}</p>
          </header>

          <label className="issue-search team-search" htmlFor="invite-search">
            <FiSearch className="issue-search-icon" aria-hidden="true" />
            <input
              id="invite-search"
              type="search"
              placeholder={t('team.invite.searchPlaceholder')}
              value={inviteSearch}
              onChange={(e) => setInviteSearch(e.target.value)}
            />
          </label>

          <label className="inline-field team-role-field">
            <span className="inline-label">{t('team.invite.role')}</span>
            <select className="inline-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="admin">{t('roles.admin')}</option>
              <option value="member">{t('roles.member')}</option>
              <option value="viewer">{t('roles.viewer')}</option>
            </select>
          </label>

          {inviteLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
          {inviteError ? <p className="dashboard-kicker">{inviteError}</p> : null}

          <div className="assigned-list">
            {(Array.isArray(inviteResults) ? inviteResults : []).map((u) => (
              <article key={u?.id} className="assigned-item">
                <div className="member-row">
                  <span className="team-avatar">{toInitials(u?.name || u?.email || '') || '??'}</span>
                  <div>
                    <h3>{u?.name || t('common.unknown')}</h3>
                    <p>{u?.email}</p>
                  </div>
                </div>
                <button type="button" className="open-btn" onClick={() => onInviteMember(u?.id)}>
                  {t('team.invite.add')}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="team-section">
          <header className="panel-head">
            <h2>{t('team.members.title')}</h2>
            <p>{t('team.members.subtitle')}</p>
          </header>

          {membersLoading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}
          {membersError ? <p className="dashboard-kicker">{membersError}</p> : null}

          <div className="assigned-list">
            {members.map((m) => {
              const u = usersById[String(m?.userId)]
              return (
                <article key={m?.userId} className="assigned-item">
                  <div className="member-row">
                    <span className="team-avatar">{toInitials(u?.name || u?.email || '') || '??'}</span>
                    <div>
                      <h3>{u?.name || t('common.unknown')}</h3>
                      <p>
                        {u?.email ? `${u.email} · ` : ''}
                        {t('team.members.role')}: {t(`roles.${safeLower(m?.role)}`, { defaultValue: String(m?.role || '-') })}
                      </p>
                    </div>
                  </div>
                  <button type="button" className="open-btn" onClick={() => onRemoveMember(m?.userId)}>
                    {t('team.members.remove')}
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}
