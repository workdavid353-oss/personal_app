// src/pages/ResetPasswordPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import styles from './ResetPasswordPage.module.css'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const { lang } = useLang()
  const { session, loading: authLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError(t('login.passwordTooShort')); return }
    if (password !== confirm) { setError(t('resetPassword.mismatch')); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  return (
    <div className={styles.page} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className={styles.card}>
        <div className={styles.mark}>◆</div>
        <h1 className={styles.title}>{t('resetPassword.title')}</h1>

        {authLoading ? (
          <p className={styles.subtitle}>{t('common.loading')}</p>
        ) : !session ? (
          <>
            <p className={styles.subtitle}>{t('resetPassword.invalidLink')}</p>
            <Link className={styles.submitBtn} to="/login">{t('login.backToLogin')}</Link>
          </>
        ) : done ? (
          <>
            <p className={styles.subtitle}>{t('resetPassword.success')}</p>
            <Link className={styles.submitBtn} to="/">{t('resetPassword.continue')}</Link>
          </>
        ) : (
          <>
            <p className={styles.subtitle}>{t('resetPassword.subtitle')}</p>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className={styles.field}>
                <span className={styles.label}>{t('resetPassword.newPassword')}</span>
                <div className={styles.inputWrap}>
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(x => !x)} tabIndex={-1}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <input
                    className={styles.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('login.minChars')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    dir="ltr"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <Lock size={16} />
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>{t('resetPassword.confirmPassword')}</span>
                <div className={styles.inputWrap}>
                  <input
                    className={styles.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('login.minChars')}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    dir="ltr"
                    autoComplete="new-password"
                  />
                  <Lock size={16} />
                </div>
              </div>

              <button className={styles.submitBtn} type="submit" disabled={loading || !password || !confirm}>
                {loading ? '…' : t('resetPassword.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
