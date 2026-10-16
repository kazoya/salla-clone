-- 003_coupons: merchant discount codes (document style, like the other collections)
CREATE TABLE IF NOT EXISTS coupons (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupons_seq_idx ON coupons (seq);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_store_code_idx ON coupons ((data->>'storeId'), (data->>'code'));
