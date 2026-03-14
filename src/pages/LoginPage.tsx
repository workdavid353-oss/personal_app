// src/pages/LoginPage.tsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LangProvider, useLang } from '../context/LangContext'
import { ThemeToggle } from '../components/ThemeToggle'
import styles from './LoginPage.module.css'

type Mode = 'login' | 'register'

function LoginForm() {
  const { session } = useAuth()
  const { t } = useTranslation()
  const { lang, toggleLang } = useLang()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [forgotMode, setForgotMode] = useState(false)

  async function handleForgotPassword() {
    if (!email.trim()) { setError(t('login.enterEmailFirst')); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(translateError(error.message))
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
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
    <div className={styles.page}>
      <div className={styles.themeBtn}>
        <button className={styles.langBtnLogin} onClick={toggleLang}>
          {lang === 'he' ? 'EN' : 'HE'}
        </button>
        <ThemeToggle />
      </div>

      <div className={styles.card}>
        {/* Logo / title */}
        <div className={styles.header}>
          <div className={styles.logo}>◈</div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            {mode === 'login' ? t('login.welcomeBack') : t('login.createAccount')}
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.activeTab : ''}`}
            onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
          >
            <LogIn size={14} /> {t('login.loginTab')}
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.activeTab : ''}`}
            onClick={() => { setMode('register'); setError(null); setSuccess(null) }}
          >
            <UserPlus size={14} /> {t('login.registerTab')}
          </button>
        </div>

        {/* Form */}
        <div className={styles.form}>
          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>{t('login.email')}</label>
            <div className={styles.inputWrap}>
              <Mail size={14} className={styles.inputIcon} />
              <input
                className={styles.input}
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                dir="ltr"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          {!forgotMode && (
          <div className={styles.field}>
            <div className={styles.passwordLabelRow}>
              <label className={styles.label}>{t('login.password')}</label>
              <button
                type="button"
                className={styles.forgotLink}
                onClick={() => { setForgotMode(true); setError(null); setSuccess(null) }}
              >
                {t('login.forgotPassword')}
              </button>
            </div>
            <div className={styles.inputWrap}>
              <Lock size={14} className={styles.inputIcon} />
              <input
                className={styles.input}
                type={showPass ? 'text' : 'password'}
                placeholder={mode === 'register' ? t('login.minChars') : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                dir="ltr"
              />
              <button
                className={styles.eyeBtn}
                onClick={() => setShowPass(x => !x)}
                type="button"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          )}

          {/* Forgot password mode */}
          {forgotMode && (
            <div className={styles.forgotBox}>
              <p className={styles.forgotDesc}>{t('login.forgotDesc')}</p>
              <button
                className={styles.submitBtn}
                onClick={handleForgotPassword}
                disabled={loading || !email.trim()}
              >
                {loading ? '...' : t('login.sendReset')}
              </button>
              <button
                className={styles.backLink}
                onClick={() => { setForgotMode(false); setError(null); setSuccess(null) }}
              >
                {t('login.backToLogin')}
              </button>
            </div>
          )}

          {/* Error / Success */}
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.successMsg}>{success}</div>}

          {/* Submit */}
          {!forgotMode && (
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? '...' : mode === 'login' ? t('login.signIn') : t('login.signUp')}
          </button>
          )}

          {/* Divider */}
          {!forgotMode && (
          <div className={styles.divider}>
            <span>{t('login.or')}</span>
          </div>
          )}

          {/* Google */}
          {!forgotMode && (
          <button
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('login.continueGoogle')}
          </button>
          )}
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
