import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as userApi from '../api/userApi'

// --- Component Icon vẽ bằng SVG cho nhẹ, không cần cài thư viện ngoài ---
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
)
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
)

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // --- States cho Profile ---
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // --- States cho Đổi mật khẩu ---
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  // --- State quản lý Ẩn/Hiện mật khẩu ---
  const [showPwd, setShowPwd] = useState({
    old: false,
    new: false,
    confirm: false
  })

  const toggleShowPwd = (field) => {
    setShowPwd(prev => ({ ...prev, [field]: !prev[field] }))
  }

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

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const data = await userApi.updateMyProfile({ name, avatar_url: avatarUrl })
      setProfile(data)
      setSuccess(t('profile.updateSuccess', { defaultValue: 'Cập nhật thông tin thành công!' }))
    } catch (err) {
      setError(err?.message || t('common.actionFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdError(t('profile.passwordRequired', { defaultValue: 'Vui lòng nhập đầy đủ thông tin mật khẩu!' }))
      return
    }

    if (newPassword !== confirmPassword) {
      setPwdError(t('profile.passwordMismatch', { defaultValue: 'Mật khẩu mới không khớp!' }))
      return
    }

    setPwdSaving(true)
    try {
      await userApi.changePassword({ old_password: oldPassword, new_password: newPassword })

      setPwdSuccess(t('profile.passwordSuccess', { defaultValue: 'Đổi mật khẩu thành công!' }))
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPwd({ old: false, new: false, confirm: false })
    } catch (err) {
      setPwdError(err?.response?.data?.message || err?.message || t('common.actionFailed'))
    } finally {
      setPwdSaving(false)
    }
  }

  const EyeButton = ({ show, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', color: '#667085',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
      }}
      tabIndex="-1"
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )

  return (
    <main className="home-page">
      <section className="home-frame">
        <section className="panel profile-panel">
          <header className="panel-head">
            <div>
              <h2>{t('profile.title', { defaultValue: 'Hồ sơ cá nhân' })}</h2>
              <p>{t('profile.subtitle', { defaultValue: 'Cập nhật thông tin cá nhân của bạn' })}</p>
            </div>
            <button type="button" className="filter-btn" onClick={() => navigate('/home')}>
              {t('common.back', { defaultValue: 'Quay lại' })}
            </button>
          </header>

          {loading ? <p className="dashboard-kicker">{t('common.loading')}</p> : null}

          {/* --- FORM 1: CẬP NHẬT THÔNG TIN --- */}
          <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '1rem' }}>
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
              <span className="inline-label">{t('profile.displayName', { defaultValue: 'Tên hiển thị' })}</span>
              <input className="inline-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="inline-field">
              <span className="inline-label">{t('profile.avatarUrl', { defaultValue: 'Đường dẫn Avatar' })}</span>
              <input className="inline-input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </label>

            {error ? <p className="inline-error" style={{ color: 'red' }}>{error}</p> : null}
            {success ? <p className="inline-success" style={{ color: 'green' }}>{success}</p> : null}

            <div className="modal-actions">
              <button type="submit" className="create-issue-btn" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>

          <hr style={{ margin: '2rem 0', borderColor: '#e7eaf0', borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />

          {/* --- FORM 2: ĐỔI MẬT KHẨU --- */}
          <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <h3 style={{ marginBottom: '1rem' }}>{t('profile.changePassword', { defaultValue: 'Đổi mật khẩu' })}</h3>
            </div>

            <label className="inline-field">
              <span className="inline-label">{t('profile.oldPassword', { defaultValue: 'Mật khẩu cũ' })}</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showPwd.old ? "text" : "password"}
                  className="inline-input"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
                <EyeButton show={showPwd.old} onClick={() => toggleShowPwd('old')} />
              </div>
            </label>

            <label className="inline-field">
              <span className="inline-label">{t('profile.newPassword', { defaultValue: 'Mật khẩu mới' })}</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showPwd.new ? "text" : "password"}
                  className="inline-input"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <EyeButton show={showPwd.new} onClick={() => toggleShowPwd('new')} />
              </div>
            </label>

            <label className="inline-field">
              <span className="inline-label">{t('profile.confirmPassword', { defaultValue: 'Xác nhận mật khẩu' })}</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showPwd.confirm ? "text" : "password"}
                  className="inline-input"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <EyeButton show={showPwd.confirm} onClick={() => toggleShowPwd('confirm')} />
              </div>
            </label>

            {pwdError ? <p className="inline-error" style={{ color: 'red' }}>{pwdError}</p> : null}
            {pwdSuccess ? <p className="inline-success" style={{ color: 'green' }}>{pwdSuccess}</p> : null}

            <div className="modal-actions">
              <button type="submit" className="create-issue-btn" disabled={pwdSaving}>
                {pwdSaving ? t('common.saving') : t('profile.updatePasswordBtn', { defaultValue: 'Cập nhật mật khẩu' })}
              </button>
            </div>
          </form>

        </section>
      </section>
    </main>
  )
}