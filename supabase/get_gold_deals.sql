CREATE OR REPLACE FUNCTION public.get_gold_deals()
 RETURNS TABLE(description text, price numeric, real_price numeric, delta numeric, karats text, weight numeric, url text, image_url text)
 LANGUAGE sql
 STABLE
AS $function$
    SELECT
      gi.description,
      (gi.price * tbr.rate)                           AS price,
      (gi.weight * gp.price * tbr.rate)               AS real_price,
      (gi.weight * gp.price * tbr.rate) - (gi.price * tbr.rate) AS delta,
      gi.karats::text,
      gi.weight,
      gi.url,
      gi.image_url
    FROM gold_items AS gi
    JOIN (
      SELECT DISTINCT ON (karat, currency) karat, currency, price
      FROM gold_prices
      ORDER BY karat, currency, fetched_at DESC
    ) AS gp
      ON REPLACE(gi.karats::text, 'K', '')::integer = gp.karat
    JOIN (
      SELECT DISTINCT ON (currency) currency, rate
      FROM table_bank_rates
      ORDER BY currency, fetched_at DESC
    ) AS tbr
      ON gp.currency = tbr.currency
    WHERE (gi.price * tbr.rate) < (gi.weight * gp.price * tbr.rate);
  $function$
