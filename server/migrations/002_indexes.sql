-- 002: helpful lookups
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users ((lower(data->>'email')));
CREATE INDEX IF NOT EXISTS products_store_idx ON products ((data->>'storeId'));
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders ((data->>'status'));
