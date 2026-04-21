import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../model/AuthContext'
import heroImage from '../../../assets/hero.png'
import './Login.css'

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
                d="M21.35 11.1H12v2.95h5.35c-.23 1.45-1.62 4.25-5.35 4.25a6.04 6.04 0 0 1 0-12.08c2.12 0 3.54.9 4.36 1.67l2.97-2.88C17.43 3.32 14.98 2.25 12 2.25A9.75 9.75 0 0 0 2.25 12 9.75 9.75 0 0 0 12 21.75c5.63 0 9.37-3.95 9.37-9.5 0-.64-.07-.95-.02-1.15Z"
                fill="#FFC107"
            />
            <path
                d="M3.37 7.46 6.8 9.99a6.02 6.02 0 0 1 5.2-3.74c2.13 0 3.55.9 4.36 1.67l2.97-2.88C17.43 3.32 14.98 2.25 12 2.25c-3.75 0-6.99 2.14-8.63 5.21Z"
                fill="#FF3D00"
            />
            <path
                d="M12 21.75c2.9 0 5.33-.95 7.11-2.59l-3.29-2.7c-.88.61-2.05 1.04-3.82 1.04a6.03 6.03 0 0 1-5.65-4.16L2.8 16.06A9.74 9.74 0 0 0 12 21.75Z"
                fill="#4CAF50"
            />
            <path
                d="M21.35 11.1H12v2.95h5.35a4.75 4.75 0 0 1-1.52 2.75l.01-.01 3.29 2.7C18.91 20.2 21.75 17.68 21.75 12.25c0-.64-.06-1.12-.4-1.15Z"
                fill="#1976D2"
            />
        </svg>
    )
}

function GithubIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
                fill="currentColor"
                d="M12 2a10 10 0 0 0-3.16 19.49c.5.1.68-.22.68-.48v-1.88c-2.78.6-3.37-1.2-3.37-1.2a2.66 2.66 0 0 0-1.11-1.47c-.91-.62.07-.6.07-.6a2.12 2.12 0 0 1 1.54 1.05 2.16 2.16 0 0 0 2.95.84 2.15 2.15 0 0 1 .64-1.36c-2.22-.25-4.56-1.11-4.56-4.95a3.88 3.88 0 0 1 1.03-2.7 3.61 3.61 0 0 1 .1-2.67s.84-.27 2.75 1.03a9.5 9.5 0 0 1 5 0c1.9-1.3 2.75-1.03 2.75-1.03.38.86.42 1.83.1 2.67a3.88 3.88 0 0 1 1.03 2.7c0 3.85-2.34 4.7-4.57 4.95a2.42 2.42 0 0 1 .68 1.87v2.77c0 .27.18.59.69.48A10 10 0 0 0 12 2Z"
            />
        </svg>
    )
}

export default function Login() {
    const navigate = useNavigate()
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [keepSignedIn, setKeepSignedIn] = useState(true)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (submitting) return

        setError('')
        setSubmitting(true)

        try {
            await signIn({ email, password })
            navigate('/home', { replace: true, state: { keepSignedIn } })
        } catch (err) {
            const apiMessage = err?.message
            setError(apiMessage || 'Sign in failed. Please check your credentials.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-shell">
                <section
                    className="login-visual"
                    style={{
                        backgroundImage: `linear-gradient(174deg, rgb(8 42 250 / 76%) 8%, rgb(20 48 240 / 88%) 100%), url(${heroImage})`,
                    }}
                >
                    <div className="visual-content">
                        <p className="visual-logo">Ledger Project</p>
                        <h1>
                            Architecture for
                            <br />
                            Deep Focus.
                        </h1>
                        <p className="visual-desc">
                            A workspace designed with editorial precision to anchor your most ambitious projects.
                        </p>
                    </div>

                    <div className="visual-underline" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </div>

                    <div className="social-proof">
                        <div className="avatar-stack" aria-hidden="true">
                            <span>A</span>
                            <span>N</span>
                            <span>T</span>
                        </div>
                        <p>Joined by 12k+ architects</p>
                    </div>
                </section>

                <section className="login-form-wrap">
                    <form className="form-box" onSubmit={handleSubmit}>
                        <h2>Welcome Back</h2>
                        <p className="sub">Enter your details to access your workspace.</p>

                        <button type="button" className="social-btn">
                            <GoogleIcon />
                            Continue with Google
                        </button>

                        <button type="button" className="social-btn">
                            <GithubIcon />
                            Continue with GitHub
                        </button>

                        <div className="divider">OR LOGIN WITH EMAIL</div>

                        <label className="field-label" htmlFor="login-email">Email Address</label>
                        <input
                            id="login-email"
                            type="text"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="username"
                            required
                        />

                        <div className="password-row">
                            <label className="field-label" htmlFor="login-password">Password</label>
                            <button type="button" className="text-link">Forgot password?</button>
                        </div>
                        <div className="password-input-wrap">
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword((current) => !current)}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        <label className="remember-me">
                            <input
                                type="checkbox"
                                checked={keepSignedIn}
                                onChange={(event) => setKeepSignedIn(event.target.checked)}
                            />
                            Keep me signed in for 30 days
                        </label>

                        {error ? <p className="form-error">{error}</p> : null}

                        <button className="login-btn" type="submit" disabled={submitting}>
                            {submitting ? 'Signing in...' : 'Sign In to Workspace'}
                        </button>

                        <p className="register-link">
                            New to Ledger Project? <a href="#">Create an account</a>
                        </p>
                        <p className="mock-note">Use your backend account credentials to sign in.</p>
                    </form>

                    <aside className="focus-tip" aria-hidden="true">
                        <p className="tip-kicker">◎+</p>
                        <p>Maintain a distraction-free environment by toggling Focus Mode in your project dashboard.</p>
                    </aside>
                </section>
            </div>
        </div>
    )
}