-- Hand-written. Postgres has sum() but no product(), and the usual trick,
-- exp(sum(ln(x))), runs through double precision: adjusted prices would pick
-- up float error. This aggregate multiplies `numeric` values exactly.
--
-- Each step rounds to 16 decimal places, so a long chain of dividend factors
-- (scale grows with every multiplication) stays small. 16 places is far
-- below the 6 that prices are stored and served with.
--
-- Used by the candle adjustment query (src/symbols/candles.repository.ts) as
-- a window aggregate. Prisma doesn't introspect functions, so no drift.

CREATE FUNCTION numeric_product_step(acc numeric, factor numeric)
RETURNS numeric
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$ SELECT round(acc * factor, 16) $$;

-- STRICT step + INITCOND: NULL inputs are skipped, an empty set yields 1.
CREATE AGGREGATE numeric_product(numeric) (
    SFUNC = numeric_product_step,
    STYPE = numeric,
    INITCOND = '1'
);
