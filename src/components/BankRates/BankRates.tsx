import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { BankRate } from '../../lib/supabase'
import styles from './BankRates.module.css'

export default function BankRates() {
  const { t } = useTranslation()
  const [rates, setRates] = useState<BankRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const currencies = t('bankRates.currencies', { returnObjects: true }) as Record<string, string>

  const fetchRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('table_bank_rates')
      .select('*')
      .order('currency')

    if (error) setError(error.message)
    else {
      setRates(data as BankRate[])
      setLastRefreshed(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRates() }, [fetchRates])

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>{t('bankRates.title')}</span>
          {lastRefreshed && (
            <span className={styles.lastRefreshed}>
              {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <button
          className={styles.refreshBtn}
          onClick={fetchRates}
          disabled={loading}
          title={t('bankRates.refresh')}
        >
          <RefreshCw size={13} className={loading ? styles.spin : ''} />
        </button>
      </div>

      {/* Rates */}
      <div className={styles.list}>
        {error && <div className={styles.error}>{error}</div>}
        {!error && rates.length === 0 && !loading && (
          <div className={styles.empty}>{t('bankRates.empty')}</div>
        )}
        {rates.map(rate => {
          const isUp = rate.change > 0
          const isDown = rate.change < 0
          return (
            <div key={rate.currency} className={styles.row}>
              <span className={styles.currency}>
                {currencies[rate.currency] ?? rate.currency}
              </span>
              <div className={styles.rateInfo}>
                <span className={styles.rate}>
                  ₪{rate.rate.toFixed(3)}
                  {rate.unit > 1 && <span className={styles.unit}> / {rate.unit}</span>}
                </span>
                <span className={`${styles.change} ${isUp ? styles.up : isDown ? styles.down : ''}`}>
                  {isUp ? '▲' : isDown ? '▼' : '–'} {Math.abs(rate.change).toFixed(3)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
