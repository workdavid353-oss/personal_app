import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Gem, Search, ImageOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GoldPriceSummary from '../components/GoldPriceSummary/GoldPriceSummary'
import styles from './GoldItemsPage.module.css'

interface GoldDeal {
  description: string
  price: number
  real_price: number
  delta: number
  karats: string
  weight: number
  url: string | null
  image_url?: string | null
}

type SortKey = keyof GoldDeal
type SortDir = 'asc' | 'desc'

function fmt(n: number) {
  return n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function GoldItemsPage() {
  const [items, setItems] = useState<GoldDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('delta')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [query, setQuery] = useState('')
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.rpc('get_gold_deals').limit(1000)
      if (error) {
        setError(error.message)
      } else {
        setItems(data as GoldDeal[])
        setLastRefreshed(new Date())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(item =>
      item.description?.toLowerCase().includes(q) ||
      item.karats?.toLowerCase().includes(q)
    )
  }, [items, query])

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={11} className={styles.sortInactive} />
    return sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
  }

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'delta',       label: 'Profit' },
    { key: 'price',       label: 'Listed' },
    { key: 'real_price',  label: 'Gold Value' },
    { key: 'weight',      label: 'Weight' },
    { key: 'karats',      label: 'Karats' },
    { key: 'description', label: 'Description' },
  ]

  return (
    <div className={styles.content}>
      <GoldPriceSummary />
      <div
        className="card card-accent"
        style={{ '--accent': 'var(--sun)', '--accent-soft': 'var(--sun-soft)' } as React.CSSProperties}
      >
        <div className="card-head">
          <span className="card-tag"><Gem size={16} /></span>
          <span className="card-title">Gold Deals</span>
          <span className="card-subtitle">listed below gold value</span>
          <div className="card-tools">
            {lastRefreshed && (
              <span className={styles.refreshedAt}>
                {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button className="tool" onClick={fetchItems} disabled={loading} title="Refresh">
              <RefreshCw size={13} className={loading ? styles.spin : ''} />
            </button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!error && (
          <>
            <div className={styles.toolbar}>
              <div className={styles.search}>
                <Search size={13} color="var(--ink-4)" />
                <input
                  placeholder="Search description or karats…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className={styles.sortBar}>
                {sortOptions.map(opt => (
                  <button
                    key={opt.key}
                    className={`${styles.sortChip} ${sortKey === opt.key ? styles.sortChipActive : ''}`}
                    onClick={() => handleSort(opt.key)}
                  >
                    {opt.label}
                    <SortIcon col={opt.key} />
                  </button>
                ))}
              </div>
            </div>

            {loading && <div className={styles.loadingRow}>Loading…</div>}
            {!loading && sorted.length === 0 && (
              <div className={styles.emptyRow}>No deals found</div>
            )}

            {!loading && sorted.length > 0 && (
              <div className={styles.grid}>
                {sorted.map((item, i) => {
                  const showImage = item.image_url && !brokenImages.has(item.image_url)
                  return (
                    <div key={i} className={styles.itemCard}>
                      <div className={styles.imgWrap}>
                        {showImage ? (
                          <img
                            src={item.image_url!}
                            alt={item.description}
                            className={styles.img}
                            loading="lazy"
                            onError={() => setBrokenImages(prev => new Set(prev).add(item.image_url!))}
                          />
                        ) : (
                          <div className={styles.imgFallback}><ImageOff size={24} /></div>
                        )}
                        {item.karats && <span className={styles.karatsBadge}>{item.karats}</span>}
                      </div>
                      <div className={styles.itemBody}>
                        <p className={styles.itemDesc}>{item.description}</p>
                        <div className={styles.itemMeta}>
                          <span className={styles.itemWeight}>{item.weight}g</span>
                          <span className={styles.itemPrice}>₪{fmt(item.price)}</span>
                        </div>
                        <div className={styles.itemFoot}>
                          <span className={styles.itemGoldValue}>Gold value ₪{fmt(item.real_price)}</span>
                          <span className={styles.profit}>+₪{fmt(item.delta)}</span>
                        </div>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                            <ExternalLink size={12} /> View listing
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className={styles.footer}>{sorted.length} deals</div>
        )}
      </div>
    </div>
  )
}
