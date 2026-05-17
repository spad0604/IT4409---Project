import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as userApi from '../api/userApi'

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    userApi.getMyProfile()
      .then((data) => {
        setProfile(data)
        setName(String(data?.name || ''))
        setAvatarUrl(String(data?.avatar_url || data?.avatarUrl || ''))
      })
      .catch((err) => setError(err?.message || t('common.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = await userApi.updateMyProfile({ name, avatar_url: avatarUrl })
      setProfile(data)
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="home-page">
      <section className="home-frame">
        <section className="panel profile-panel">
          <header className="panel-head">
            <div>
              <h2>{t('profile.title', { defaultValue: 'Profile' })}</h2>
              <p>{t('profile.subtitle', { defaultValue: 'Update your personal details' })}</p>
            </div>
            <button type="button" className="filter-btn" onClick={() => navigate('/home')}>
              {t('common.back')}
            </button>
          </header>

          {loading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}

          <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>
            <div className="profile-hero">
              <div className="profile-avatar-preview">
                {avatarUrl ? <img src={avatarUrl} alt={name || 'avatar'} /> : <span>{String(name || profile?.email || '?').slice(0, 2).toUpperCase()}</span>}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{profile?.name || t('common.unknown')}</h3>
                <p style={{ margin: '0.25rem 0 0', color: '#667085' }}>{profile?.email || ''}</p>
              </div>
            </div>

            <label className="inline-field">
              <span className="inline-label">{t('profile.displayName', { defaultValue: 'Display name' })}</span>
              <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="inline-field">
              <span className="inline-label">{t('profile.avatarUrl', { defaultValue: 'Avatar URL' })}</span>
              <input className="inline-input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </label>

            {error ? <p className="inline-error">{error}</p> : null}

            <div className="modal-actions">
              <button type="submit" className="create-issue-btn" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  )
}
