-- ============================================================
-- CleanWear Product Cache Table
-- Run this in Supabase SQL Editor ONCE to set up the cache.
-- Every scan result gets stored here. Future scans hit cache first.
-- This is how your database grows with every user (the Yuka model).
-- ============================================================

-- Product cache — stores every scanned product
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  barcode TEXT UNIQUE,
  search_key TEXT UNIQUE,
  brand TEXT,
  product_name TEXT NOT NULL,
  category TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_search_key ON products USING gin(search_key gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- Enable trigram extension for fuzzy text search (needed for ILIKE performance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Allow anonymous reads and writes (same as your scans table)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update products"
  ON products FOR UPDATE
  USING (true);

-- ============================================================
-- USEFUL QUERIES (run these in SQL Editor to see your data)
-- ============================================================

-- Total products in cache
-- SELECT COUNT(*) FROM products;

-- Products by brand
-- SELECT brand, COUNT(*) as products FROM products WHERE brand IS NOT NULL GROUP BY brand ORDER BY products DESC LIMIT 20;

-- Products by source (see which layer is feeding your cache)
-- SELECT data->>'_source' as source, COUNT(*) FROM products GROUP BY source;

-- Most scanned products (join with scans table)
-- SELECT p.product_name, p.brand, COUNT(s.id) as scan_count
-- FROM products p
-- JOIN scans s ON s.product = p.product_name
-- GROUP BY p.product_name, p.brand
-- ORDER BY scan_count DESC LIMIT 20;
