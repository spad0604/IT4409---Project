<<<<<<< HEAD
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../model/AuthContext'
=======
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../model/AuthContext'
import { oauthStartUrl } from '../api/authApi'
import { setToken } from '../../../shared/storage/token'
>>>>>>> main
import { useTranslation } from 'react-i18next'
import heroImage from '../../../assets/hero.png'
import './Auth.css'

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M21.35 11.1H12v2.95h5.35c-.23 1.45-1.62 4.25-5.35 4.25a6.04 6.04 0 0 1 0-12.08c2.12 0 3.54.9 4.36 1.67l2.97-2.88C17.43 3.32 14.98 2.25 12 2.25A9.75 9.75 0 0 0 2.25 12 9.75 9.75 0 0 0 12 21.75c5.63 0 9.37-3.95 9.37-9.5 0-.64-.07-.95-.02-1.15Z" fill="#FFC107" />
            <path d="M3.37 7.46 6.8 9.99a6.02 6.02 0 0 1 5.2-3.74c2.13 0 3.55.9 4.36 1.67l2.97-2.88C17.43 3.32 14.98 2.25 12 2.25c-3.75 0-6.99 2.14-8.63 5.21Z" fill="#FF3D00" />
            <path d="M12 21.75c2.9 0 5.33-.95 7.11-2.59l-3.29-2.7c-.88.61-2.05 1.04-3.82 1.04a6.03 6.03 0 0 1-5.65-4.16L2.8 16.06A9.74 9.74 0 0 0 12 21.75Z" fill="#4CAF50" />
            <path d="M21.35 11.1H12v2.95h5.35a4.75 4.75 0 0 1-1.52 2.75l.01-.01 3.29 2.7C18.91 20.2 21.75 17.68 21.75 12.25c0-.64-.06-1.12-.4-1.15Z" fill="#1976D2" />
        </svg>
    )
}

function GithubIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.1.68-.22.68-.48v-1.88c-2.78.6-3.37-1.2-3.37-1.2a2.66 2.66 0 0 0-1.11-1.47c-.91-.62.07-.6.07-.6a2.12 2.12 0 0 1 1.54 1.05 2.16 2.16 0 0 0 2.95.84 2.15 2.15 0 0 1 .64-1.36c-2.22-.25-4.56-1.11-4.56-4.95a3.88 3.88 0 0 1 1.03-2.7 3.61 3.61 0 0 1 .1-2.67s.84-.27 2.75 1.03a9.5 9.5 0 0 1 5 0c1.9-1.3 2.75-1.03 2.75-1.03.38.86.42 1.83.1 2.67a3.88 3.88 0 0 1 1.03 2.7c0 3.85-2.34 4.7-4.57 4.95a2.42 2.42 0 0 1 .68 1.87v2.77c0 .27.18.59.69.48A10 10 0 0 0 12 2Z" />
        </svg>
    )
}

export default function Login() {
    const { t } = useTranslation()
    const navigate = useNavigate()
<<<<<<< HEAD
    const { signIn } = useAuth()

=======
    const { signIn, refreshMe } = useAuth()
>>>>>>> main
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [keepSignedIn, setKeepSignedIn] = useState(true)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [oauthSubmitting, setOauthSubmitting] = useState('')

    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const oauthToken = params.get('token')
        const oauthError = params.get('error')

        if (oauthError) {
            setError(t('auth.loginFailed'))
            window.history.replaceState(null, '', window.location.pathname)
            return
        }

        if (!oauthToken) return

        let cancelled = false
        setSubmitting(true)
        setToken(oauthToken)

        refreshMe()
            .then(() => {
                if (!cancelled) window.location.replace('/home/dashboard')
            })
            .catch(() => {
                setToken(null)
                if (!cancelled) {
                    setError(t('auth.loginFailed'))
                    setSubmitting(false)
                    window.history.replaceState(null, '', window.location.pathname)
                }
            })

        return () => {
            cancelled = true
        }
    }, [refreshMe, t])

    const handleOAuthStart = (provider) => {
        if (submitting || oauthSubmitting) return
        setError('')
        setOauthSubmitting(provider)
        window.location.assign(oauthStartUrl(provider))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (submitting) return

        setError('')
        setSubmitting(true)

        try {
            await signIn({ email, password })
            navigate('/home/dashboard', { replace: true, state: { keepSignedIn } })
        } catch (err) {
<<<<<<< HEAD
            const apiMessage = err?.response?.data?.message
            setError(apiMessage || t('login.error'))
=======
            const apiMessage = err?.message
            setError(apiMessage || t('auth.loginFailed'))
>>>>>>> main
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-shell">
                <section
                    className="auth-visual"
                    style={{
                        backgroundImage: `url(${heroImage})`,
                    }}
                >
                    <div className="visual-content">
<<<<<<< HEAD
                        <p className="visual-logo">{t('login.projectName')}</p>
                        <h1>
                            {t('login.titleLine1')} <br />
                            {t('login.titleLine2')}
                        </h1>
                        <p className="visual-desc">{t('login.description')}</p>
=======
                        <p className="visual-logo">{t('auth.login.brand')}</p>
                        <h1>
                            {t('auth.login.headlineLine1')}
                            <br />
                            {t('auth.login.headlineLine2')}
                        </h1>
                        <p className="visual-desc">
                            {t('auth.login.description')}
                        </p>
                    </div>

                    <div className="visual-underline" aria-hidden="true">
                        <span />
                        <span />
                        <span />
>>>>>>> main
                    </div>

                    <div className="social-proof">
                        <div className="avatar-stack">
                            <span>A</span>
                            <span>N</span>
                            <span>T</span>
                        </div>
<<<<<<< HEAD
                        <p>{t('login.socialProof')}</p>
=======
                        <p>{t('auth.login.socialProof')}</p>
>>>>>>> main
                    </div>
                </section>

                <section className="auth-form-wrap">
                    <form className="form-box" onSubmit={handleSubmit}>
<<<<<<< HEAD
                        <h2>{t('login.welcome')}</h2>
                        <p className="sub">{t('login.subtitle')}</p>
=======
                        <h2>{t('auth.login.welcomeBack')}</h2>
                        <p className="sub">{t('auth.login.welcomeSub')}</p>
>>>>>>> main

                        <button
                            type="button"
                            className="social-btn"
                            onClick={() => handleOAuthStart('google')}
                            disabled={submitting || Boolean(oauthSubmitting)}
                        >
                            <GoogleIcon />
<<<<<<< HEAD
                            {t('login.google')}
=======
                            {t('auth.login.continueGoogle')}
>>>>>>> main
                        </button>

                        <button
                            type="button"
                            className="social-btn"
                            onClick={() => handleOAuthStart('github')}
                            disabled={submitting || Boolean(oauthSubmitting)}
                        >
                            <GithubIcon />
<<<<<<< HEAD
                            {t('login.github')}
                        </button>

                        <div className="divider">{t('login.or')}</div>

                        <label className="field-label">{t('login.email')}</label>
=======
                            {t('auth.login.continueGithub')}
                        </button>

                        <div className="divider">{t('auth.login.divider')}</div>

                        <label className="field-label" htmlFor="login-email">{t('auth.login.emailLabel')}</label>
>>>>>>> main
                        <input
                            type="text"
<<<<<<< HEAD
                            placeholder={t('login.emailPlaceholder')}
=======
                            placeholder={t('auth.login.emailPlaceholder')}
>>>>>>> main
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <div className="password-row">
<<<<<<< HEAD
                            <label className="field-label">{t('login.password')}</label>

=======
                            <label className="field-label" htmlFor="login-password">{t('auth.login.passwordLabel')}</label>
                            <button type="button" className="text-link">{t('auth.login.forgotPassword')}</button>
>>>>>>> main
                        </div>

                        <div className="password-input-wrap">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder={t('login.passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
<<<<<<< HEAD
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? t('login.hide') : t('login.show')}
=======
                                aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                                onClick={() => setShowPassword((current) => !current)}
                            >
                                {showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
>>>>>>> main
                            </button>
                        </div>

                        <button type="button" className="text-link">
                            {t('login.forgot')}
                        </button>

                        <label className="remember-me">
                            <input
                                type="checkbox"
                                checked={keepSignedIn}
                                onChange={(e) => setKeepSignedIn(e.target.checked)}
                            />
<<<<<<< HEAD
                            {t('login.remember')}
=======
                            {t('auth.login.keepSignedIn')}
>>>>>>> main
                        </label>

                        {error && <p className="form-error">{error}</p>}

<<<<<<< HEAD
                        <button className="login-btn" type="submit">
                            {submitting ? t('login.signingIn') : t('login.signIn')}
                        </button>

                        <p className="register-link">
                            {t('login.noAccount')}{' '}
                            <Link to="/register" className="link">
                                {t('login.create')}
                            </Link>
                        </p>

                        <p className="mock-note">{t('login.mock')}</p>
                    </form>
=======
                        <button className="login-btn" type="submit" disabled={submitting}>
                            {submitting ? t('auth.login.signingIn') : t('auth.login.signIn')}
                        </button>

                        <p className="register-link">
                            {t('auth.login.registerPrompt')} <a href="#">{t('auth.login.createAccount')}</a>
                        </p>
                        <p className="mock-note">{t('auth.login.mockNote')}</p>
                    </form>

                    <aside className="focus-tip" aria-hidden="true">
                        <p className="tip-kicker">◎+</p>
                        <p>{t('auth.login.focusTip')}</p>
                    </aside>
>>>>>>> main
                </section>
            </div>
        </div>
    )
}
