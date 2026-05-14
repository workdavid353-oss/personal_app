// src/components/Stocks/StockCard.tsx
import { useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { StockData } from './useStocks'
import styles from './Stocks.module.css'

interface Props {
  symbol: string
  data: StockData | undefined
  onRemove: (symbol: string) => void
  onRefresh: (symbol: string, force?: boolean) => void
  range: 7 | 30
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return `${v}`
}

function fmtMktCap(m: number): string {
  if (m >= 1e6) return `$${(m / 1e6).toFixed(1)}T`
  if (m >= 1e3) return `$${(m / 1e3).toFixed(1)}B`
  return `$${m.toFixed(0)}M`
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  if (p.close == null) return null
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipDate}>{p.date.slice(5)}</span>
      <div className={styles.tooltipRow}><span className={styles.tooltipLabel}>Close</span><span>${p.close.toFixed(2)}</span></div>
      {p.high != null && <div className={styles.tooltipRow}><span className={styles.tooltipLabel}>High</span><span className={styles.tooltipHigh}>${p.high.toFixed(2)}</span></div>}
      {p.low  != null && <div className={styles.tooltipRow}><span className={styles.tooltipLabel}>Low</span> <span className={styles.tooltipLow}>${p.low.toFixed(2)}</span></div>}
    </div>
  )
}

function shortExchange(ex: string): string {
  if (ex.includes('NASDAQ')) return 'NASDAQ'
  if (ex.includes('NYSE'))   return 'NYSE'
  return ex.split(' ')[0]
}

export default function StockCard({ symbol, data, onRemove, onRefresh, range }: Props) {
  const [logoError, setLogoError] = useState(false)
  const { t } = useTranslation()
  const isLoading = !data || data.loading
  const isUp    = data?.quote ? data.quote.changePct >= 0 : null
  const color   = isUp === null ? 'var(--hair)' : isUp ? 'var(--sage)' : 'var(--coral)'
  const colorHex = isUp === null ? '#888' : isUp ? '#22c55e' : '#ef4444'
  const colorBg  = isUp ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)'
  const chartData = data?.history?.slice(-range) ?? []

  return (
    <div className={styles.card} style={{ borderLeftColor: color }}>

      {/* ── Header: logo + identity + actions ── */}
      <div className={styles.cardHeader}>
        <div className={styles.cardIdentity}>
          {data?.profile?.logo && !logoError
            ? <img src={data.profile.logo} alt={symbol} className={styles.logo} onError={() => setLogoError(true)} />
            : <div className={styles.logoFallback}>{symbol[0]}</div>
          }
          <div className={styles.cardMeta}>
            <div className={styles.cardTitleRow}>
              <span className={styles.cardSymbol}>{symbol}</span>
              {data?.profile?.exchange && (
                <span className={styles.exchange}>{shortExchange(data.profile.exchange)}</span>
              )}
            </div>
            {data?.profile?.name && <span className={styles.cardName}>{data.profile.name}</span>}
            {data?.profile?.industry && <span className={styles.industry}>{data.profile.industry}</span>}
          </div>
        </div>

        <div className={styles.cardActions}>
          <button className={styles.iconBtn} onClick={() => onRefresh(symbol, true)} title={t('stocks.refresh')}>
            <RefreshCw size={12} />
          </button>
          <button className={`${styles.iconBtn} ${styles.removeBtn}`} onClick={() => onRemove(symbol)} title={t('stocks.remove')}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* ── Loading / error ── */}
      {isLoading && <div className={styles.cardLoading}>{t('common.loading')}</div>}
      {!isLoading && data?.error && <div className={styles.cardError}>{data.error}</div>}

      {/* ── Data ── */}
      {!isLoading && data?.quote && !data.error && (
        <>
          {/* Price + change */}
          <div className={styles.priceRow}>
            <span className={styles.price}>${data.quote.price.toFixed(2)}</span>
            <span className={`${styles.change} ${isUp ? styles.up : styles.down}`}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isUp ? '+' : ''}{data.quote.changePct.toFixed(2)}%
            </span>
            <span className={styles.changeAbs} style={{ color: colorHex }}>
              {isUp ? '+' : ''}{data.quote.change.toFixed(2)}
            </span>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className={styles.chartWrap} style={{ background: colorBg }}>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={colorHex} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={colorHex} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="close" stroke={colorHex} strokeWidth={1.5}
                    fill={`url(#grad-${symbol})`} dot={false} activeDot={{ r: 3, fill: colorHex }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {chartData.length === 0 && <div className={styles.chartUnavailable}>{t('stocks.chartUnavailable')}</div>}

          {/* OHLC stats */}
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Open</span>
              <span className={styles.statValue}>${data.quote.open.toFixed(2)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>High</span>
              <span className={`${styles.statValue} ${styles.statUp}`}>${data.quote.high.toFixed(2)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Low</span>
              <span className={`${styles.statValue} ${styles.statDown}`}>${data.quote.low.toFixed(2)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Prev</span>
              <span className={styles.statValue}>${data.quote.prevClose.toFixed(2)}</span>
            </div>
          </div>

          {/* Extended metrics */}
          <div className={styles.statsGrid}>
            {data.metrics && <>
              <div className={styles.stat}>
                <span className={styles.statLabel}>52W H</span>
                <span className={styles.statValue}>${data.metrics.weekHigh52.toFixed(0)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>52W L</span>
                <span className={styles.statValue}>${data.metrics.weekLow52.toFixed(0)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Fwd P/E</span>
                <span className={styles.statValue}>{data.metrics.forwardPE?.toFixed(1) ?? '—'}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>EPS</span>
                <span className={styles.statValue}>{data.metrics.eps?.toFixed(2) ?? '—'}</span>
              </div>
            </>}
            <div className={styles.stat}>
              <span className={styles.statLabel}>Vol</span>
              <span className={styles.statValue}>{fmtVol(data.quote.volume)}</span>
            </div>
            {data.profile?.marketCap ? (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Mkt Cap</span>
                <span className={styles.statValue}>{fmtMktCap(data.profile.marketCap)}</span>
              </div>
            ) : null}
            {data.metrics?.beta != null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Beta</span>
                <span className={styles.statValue}>{data.metrics.beta.toFixed(2)}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
