CREATE OR REPLACE FUNCTION public.get_gold_price_summary()
 RETURNS TABLE(karat integer, currency text, price numeric, prev_price numeric, change numeric, change_pct numeric, fetched_at timestamptz)
 LANGUAGE sql
 STABLE
AS $function$
  WITH ranked AS (
    SELECT
      karat, currency, price, fetched_at,
      ROW_NUMBER() OVER (PARTITION BY karat, currency ORDER BY fetched_at DESC) AS rn
    FROM gold_prices
    WHERE currency = 'ILS'
  )
  SELECT
    latest.karat,
    latest.currency,
    latest.price,
    prev.price AS prev_price,
    latest.price - prev.price AS change,
    CASE WHEN prev.price IS NULL OR prev.price = 0 THEN NULL
         ELSE ROUND(((latest.price - prev.price) / prev.price) * 100, 2) END AS change_pct,
    latest.fetched_at
  FROM ranked latest
  LEFT JOIN ranked prev
    ON prev.karat = latest.karat AND prev.currency = latest.currency AND prev.rn = 2
  WHERE latest.rn = 1
  ORDER BY latest.karat;
$function$
