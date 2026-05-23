import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../model/AuthContext'
import './Login.css'

function readOAuthParams() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)
  return hashParams.size > 0 ? hashParams : queryParams
}

export default function OAuthCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { completeOAuth, signOut } = useAuth()
  const handledRef = useRef(false)
  const [oauthResult] = useState(() => {
    const params = readOAuthParams()
    const token = params.get('token')
    return {
      token,
      hasInitialError: Boolean(params.get('error') || !token),
    }
  })
  const [failed, setFailed] = useState(oauthResult.hasInitialError)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    if (oauthResult.hasInitialError) {
      signOut()
      return
    }

    completeOAuth(oauthResult.token)
      .then(() => navigate('/home', { replace: true }))
      .catch(() => {
        signOut()
        setFailed(true)
      })
  }, [completeOAuth, navigate, oauthResult, signOut])

  return (
    <div className="login-page">
      <section className="form-box oauth-callback-box">
        <h2>{failed ? t('auth.oauthFailedTitle') : t('auth.oauthSigningIn')}</h2>
        {failed ? <p className="form-error">{t('auth.oauthFailed')}</p> : <p className="sub">{t('common.loading')}</p>}
        {failed ? (
          <button type="button" className="login-btn" onClick={() => navigate('/login', { replace: true })}>
            {t('common.backToLogin', { defaultValue: 'Back to login' })}
          </button>
        ) : null}
      </section>
    </div>
  )
}
