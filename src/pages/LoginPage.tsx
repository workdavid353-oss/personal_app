// src/pages/LoginPage.tsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Eye, EyeOff, ArrowRight, User, Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LangProvider, useLang } from '../context/LangContext'
import { useTheme } from '../context/ThemeContext'
import styles from './LoginPage.module.css'

type Mode = 'login' | 'register'

const FEATURE_KEYS = ['todos', 'weather', 'stocks', 'bankRates', 'newsDigest'] as const

function LoginForm() {
  const { session } = useAuth()
  const { t } = useTranslation()
  const { lang, toggleLang } = useLang()
  const { theme, toggle: toggleTheme } = useTheme()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [forgotMode, setForgotMode] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setSuccess(null)
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError(t('login.enterEmailFirst')); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(translateError(error.message))
    else setSuccess(t('login.resetEmailSent'))
    setLoading(false)
  }

  // Already logged in → redirect to dashboard
  if (session) return <Navigate to="/" replace />

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    const trimmedEmail = email.trim()
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
      if (error) setError(translateError(error.message))
    } else {
      const { error } = await supabase.auth.signUp({ email: trimmedEmail, password })
      if (error) setError(translateError(error.message))
      else setSuccess(t('login.confirmationSent'))
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setError(translateError(error.message)); setLoading(false) }
  }

  function translateError(msg: string): string {
    if (msg.includes('Invalid login')) return t('login.invalidCredentials')
    if (msg.includes('Email not confirmed')) return t('login.emailNotConfirmed')
    if (msg.includes('User already registered')) return t('login.userExists')
    if (msg.includes('Password should be')) return t('login.passwordTooShort')
    return msg
  }

  return (
    <div className={styles.page} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className={styles.formCol}>
        <div className={styles.topbar}>
          <button
            className={styles.chip}
            onClick={toggleLang}
            title={lang === 'he' ? 'Switch to English' : 'עבור לעברית'}
          >
            {lang === 'he' ? 'EN' : 'HE'}
          </button>
          <button
            className={`${styles.chip} ${styles.iconOnly}`}
            onClick={toggleTheme}
            title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.mark}>◆</div>
          <h1 className={styles.title}>{t('login.appTitle')}</h1>
          <p className={styles.subtitle}>
            {mode === 'login' ? t('login.welcomeBack') : t('login.createAccount')}
          </p>

          {!forgotMode && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.activeTab : ''}`}
              onClick={() => switchMode('login')}
            >
              <ArrowRight size={13} /> {t('login.loginTab')}
            </button>
            <button
              className={`${styles.tab} ${mode === 'register' ? styles.activeTab : ''}`}
              onClick={() => switchMode('register')}
            >
              <User size={13} /> {t('login.registerTab')}
            </button>
          </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.successMsg}>{success}</div>}

          {!forgotMode ? (
            <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
              {/* Email */}
              <div className={styles.field}>
                <div className={styles.fieldRow}>
                  <span className={styles.label}>{t('login.email')}</span>
                </div>
                <div className={styles.inputWrap}>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    dir="ltr"
                    autoComplete="email"
                    autoFocus
                  />
                  <Mail size={16} />
                </div>
              </div>

              {/* Password */}
              <div className={styles.field}>
                <div className={styles.fieldRow}>
                  <span className={styles.label}>{t('login.password')}</span>
                  <button
                    type="button"
                    className={styles.forgotLink}
                    onClick={() => { setForgotMode(true); setError(null); setSuccess(null) }}
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <div className={styles.inputWrap}>
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPass(x => !x)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <input
                    className={styles.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder={mode === 'register' ? t('login.minChars') : '••••••••'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    dir="ltr"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                className={styles.submitBtn}
                type="submit"
                disabled={loading || !email.trim() || !password.trim()}
              >
                {loading ? '…' : mode === 'login' ? t('login.signIn') : t('login.signUp')}
              </button>
            </form>
          ) : (
            <div className={styles.forgotBox}>
              <p className={styles.forgotDesc}>{t('login.forgotDesc')}</p>
              <button
                className={styles.submitBtn}
                onClick={handleForgotPassword}
                disabled={loading || !email.trim()}
              >
                {loading ? '…' : t('login.sendReset')}
              </button>
              <button
                className={styles.backLink}
                onClick={() => { setForgotMode(false); setError(null); setSuccess(null) }}
              >
                {t('login.backToLogin')}
              </button>
            </div>
          )}

          {!forgotMode && (
            <>
              <div className={styles.divider}>{t('login.or')}</div>

              <button className={styles.googleBtn} type="button" onClick={handleGoogle} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                  <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z" />
                  <path fill="#4CAF50" d="M24 44c5.4 0 10.4-1.9 14.1-5.4l-6.6-5.6C29.4 34.6 26.9 35.5 24 35.5c-5.3 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6.1l6.6 5.6C40.5 37.1 44 31.1 44 24c0-1.3-.1-2.7-.4-3.5z" />
                </svg>
                {t('login.continueGoogle')}
              </button>

              <div className={styles.foot}>
                {mode === 'login' ? (
                  <span>{t('login.noAccount')} <a onClick={() => switchMode('register')}>{t('login.registerTab')}</a></span>
                ) : (
                  <span>{t('login.haveAccount')} <a onClick={() => switchMode('login')}>{t('login.loginTab')}</a></span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.side}>
        <div className={styles.sideContent}>
          <div className={styles.sideMark}>◆</div>
          <h2 className={styles.sideTitle}>{t('login.sideHeadline')}</h2>
          <p className={styles.sideSub}>{t('login.sideText')}</p>
          <div className={styles.sideChips}>
            {FEATURE_KEYS.map(key => (
              <span key={key} className={styles.sideChip}>
                <span className={styles.sideDot} />
                {t(`widgets.${key}`)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <LangProvider>
      <LoginForm />
    </LangProvider>
  )
}
