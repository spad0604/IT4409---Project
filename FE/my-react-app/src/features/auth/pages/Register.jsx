import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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


export default function Register() {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [agree, setAgree] = useState(false)

    return (
        <div className="auth-page">
            <div className="auth-shell">
                <section
                    className="auth-visual"
                    style={{
                        backgroundImage: `linear-gradient(174deg, rgb(8 42 250 / 76%) 8%, rgb(20 48 240 / 88%) 100%), url(${heroImage})`,
                    }}
                >
                    <div className="visual-content">
                        <p className="visual-logo">{t('register.projectName')}</p>

                        <h1 className="register-title">
                            {t('register.title')}
                        </h1>

                        <p className="visual-desc">
                            {t('register.description')}
                        </p>

                        <div className="register-card">
                            <div className='social-proof'>
                                <div className="avatar-stack">
                                    <span>N</span>
                                    <span>M</span>
                                    <span>H</span>
                                </div>
                                <p>{t('register.socialProof')}</p>
                            </div>
                            <div className="progress-bar">
                                <span style={{ width: '70%' }} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="auth-form-wrap">
                    <form className="form-box">
                        <h2>{t('register.create')}</h2>
                        <p className="sub">{t('register.subtitle')}</p>

                        {/* SOCIAL */}
                        <button type="button" className="social-btn">
                            <GoogleIcon />
                            {t('register.google')}
                        </button>

                        <button type="button" className="social-btn">
                            <GithubIcon />
                            {t('register.github')}
                        </button>

                        <div className="divider">{t('register.or')}</div>

                        {/* NAME */}
                        <label className="field-label">
                            {t('register.name')}
                        </label>
                        <input
                            type="text"
                            placeholder={t('register.namePlaceholder')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />

                        {/* EMAIL */}
                        <label className="field-label">
                            {t('register.email')}
                        </label>
                        <input
                            type="email"
                            placeholder={t('register.emailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />


                        <div className="password-row">
                            <label className="field-label">{t('login.password')}</label>

                        </div>

                        <div className="password-input-wrap">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder={t('register.passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? t('register.hide') : t('register.show')}
                            </button>
                        </div>


                        <label className="terms">
                            <input
                                type="checkbox"
                                checked={agree}
                                onChange={(e) => setAgree(e.target.checked)}
                            />
                            <span className="custom-checkbox"></span>
                            <span>{t('register.terms')}</span>
                        </label>

                        <button className="register-btn">
                            {t('register.submit')}
                        </button>

                        <p className="register-link">
                            {t('register.haveAccount')}{' '}
                            <Link to="/login" className="link">
                                {t('register.signin')}
                            </Link>
                        </p>

                    </form>
                </section>
            </div>
        </div>
    )
}