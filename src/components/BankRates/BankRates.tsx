import { useState, useEffect, useCallback } from 'react'
import { Globe, RefreshCw, Search, ArrowLeftRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { BankRate } from '../../lib/supabase'
import styles from './BankRates.module.css'

const CURRENCY_GLYPHS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: '₣',
  CAD: '$', AUD: '$', SEK: 'kr', NOK: 'kr', DKK: 'kr',
  ZAR: 'R', JOD: 'د', EGP: 'E£', TRY: '₺',
}

export default function BankRates() {
  const { t } = useTranslation()
  const [rates, setRates] = useState<BankRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [calcAmount, setCalcAmount] = useState('')
  const [calcCurrency, setCalcCurrency] = useState('')
  const [flipped, setFlipped] = useState(false) // false = FCY→ILS, true = ILS→FCY

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
      const fetched = data as BankRate[]
      setRates(fetched)
      if (!calcCurrency && fetched.length > 0) setCalcCurrency(fetched[0].currency)
    }
    setLoading(false)
  }, [calcCurrency])

  useEffect(() => { fetchRates() }, [fetchRates])

  // Compute conversion result
  const selectedRate = rates.find(r => r.currency === calcCurrency)
  let calcResult = ''
  if (selectedRate && calcAmount !== '') {
    const amount = parseFloat(calcAmount)
    if (!isNaN(amount)) {
      const ratePerUnit = selectedRate.rate / selectedRate.unit
      if (!flipped) {
        // FCY → ILS
        calcResult = (amount * ratePerUnit).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      } else {
        // ILS → FCY
        calcResult = (amount / ratePerUnit).toLocaleString('he-IL', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
      }
    }
  }

  const fromLabel = flipped ? 'ILS' : (calcCurrency || '—')
  const toLabel   = flipped ? (calcCurrency || '—') : 'ILS'

  return (
    <div
      className="card card-accent"
      style={{ '--accent': 'var(--sage)', '--accent-soft': 'var(--sage-soft)' } as React.CSSProperties}
    >
      <div className="card-head">
        <span className="card-tag"><Globe size={16} /></span>
        <span className="card-title">{t('bankRates.title', 'FX rates')}</span>
        <span className="card-subtitle">vs ILS</span>
        <div className="card-tools">
          <button
            className={`tool ${styles.refreshBtn}`}
            onClick={fetchRates}
            disabled={loading}
            title={t('bankRates.refresh')}
          >
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className={styles.searchRow}>
        <Search size={13} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder={t('bankRates.searchPlaceholder', 'Search currency…')}
          value={query}
          onChange={e => setQuery(e.target.value.toUpperCase())}
          dir="ltr"
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => setQuery('')}>×</button>
        )}
      </div>

      {/* ── Calculator ── */}
      <div className={styles.calcBox}>
        <div className={styles.calcRow}>
          <input
            className={styles.calcInput}
            type="number"
            min="0"
            placeholder="0"
            value={calcAmount}
            onChange={e => setCalcAmount(e.target.value)}
            dir="ltr"
          />
          <select
            className={styles.calcSelect}
            value={flipped ? 'ILS' : calcCurrency}
            onChange={e => {
              if (e.target.value === 'ILS') { setFlipped(true) }
              else { setCalcCurrency(e.target.value); setFlipped(false) }
            }}
          >
            <option value="ILS">ILS</option>
            {rates.map(r => (
              <option key={r.currency} value={r.currency}>{r.currency}</option>
            ))}
          </select>

          <button
            className={styles.swapBtn}
            onClick={() => setFlipped(f => !f)}
            title="Swap direction"
          >
            <ArrowLeftRight size={13} />
          </button>

          <div className={styles.calcResult}>
            <span className={styles.calcResultNum}>{calcResult || '—'}</span>
            <span className={styles.calcResultCcy}>{toLabel}</span>
          </div>
        </div>

        {selectedRate && calcAmount !== '' && calcResult && (
          <div className={styles.calcHint}>
            1 {fromLabel} = {flipped
              ? `${(1 / (selectedRate.rate / selectedRate.unit)).toFixed(4)} ${toLabel}`
              : `${(selectedRate.rate / selectedRate.unit).toFixed(4)} ${toLabel}`
            }
          </div>
        )}
      </div>

      {/* ── Rates list ── */}
      <div className={styles.list}>
        {error && <div className={styles.error}>{error}</div>}
        {!error && rates.length === 0 && !loading && (
          <div className={styles.empty}>{t('bankRates.empty')}</div>
        )}
        {rates.filter(rate => {
          if (!query) return true
          const name = (currencies[rate.currency] ?? '').toLowerCase()
          return rate.currency.includes(query) || name.includes(query.toLowerCase())
        }).map(rate => {
          const isUp = rate.change > 0
          const isDown = rate.change < 0
          const glyph = CURRENCY_GLYPHS[rate.currency] ?? rate.currency.charAt(0)
          const name = currencies[rate.currency] ?? rate.currency
          return (
            <div
              key={rate.currency}
              className={`${styles.row} ${calcCurrency === rate.currency ? styles.rowSelected : ''}`}
              onClick={() => { setCalcCurrency(rate.currency); setFlipped(false) }}
            >
              <div className={styles.flag}>{glyph}</div>
              <span className={styles.code}>{rate.currency}/ILS</span>
              <span className={styles.name}>{name}</span>
              <span className={styles.rate}>
                {rate.rate.toFixed(3)}
                {rate.unit > 1 && <span style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 2 }}> /{rate.unit}</span>}
              </span>
              <span className={`${styles.delta} ${isUp ? styles.up : isDown ? styles.down : ''}`}>
                {isUp ? '▲' : isDown ? '▼' : '–'} {Math.abs(rate.change).toFixed(3)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
