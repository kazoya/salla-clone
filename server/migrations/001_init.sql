-- 001_init: one table per collection; each row is stored as JSONB (document style).
CREATE TABLE IF NOT EXISTS stores (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stores_seq_idx ON stores (seq);
CREATE TABLE IF NOT EXISTS products (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_seq_idx ON products (seq);
CREATE TABLE IF NOT EXISTS carts (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carts_seq_idx ON carts (seq);
CREATE TABLE IF NOT EXISTS orders (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_seq_idx ON orders (seq);
CREATE TABLE IF NOT EXISTS users (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_seq_idx ON users (seq);
