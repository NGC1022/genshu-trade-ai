-- 商品经营分析：将近30天销量与总销量拆开，支持前台排序和后台报表。
ALTER TABLE sku ADD COLUMN IF NOT EXISTS monthly_sold INT NOT NULL DEFAULT 0;
ALTER TABLE sku ADD COLUMN IF NOT EXISTS last_sold_at TIMESTAMPTZ;
ALTER TABLE sku ADD CONSTRAINT sku_monthly_sold_nonneg CHECK (monthly_sold >= 0);

CREATE INDEX IF NOT EXISTS idx_sku_monthly_sold ON sku(monthly_sold DESC);
CREATE INDEX IF NOT EXISTS idx_sku_stock_sold ON sku(stock_sold DESC);

-- 用确认订单时的数量更新总销量和近30天销量。月销量由定时任务按月归档/重算，
-- 这里先维护实时增量，避免仅依赖前端模拟数据。
CREATE OR REPLACE FUNCTION confirm_sku_stock(
  p_sku_code TEXT,
  p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sku
  SET
    stock_reserved = stock_reserved - p_quantity,
    stock_sold = stock_sold + p_quantity,
    monthly_sold = monthly_sold + p_quantity,
    last_sold_at = NOW(),
    updated_at = NOW()
  WHERE sku_code = p_sku_code AND stock_reserved >= p_quantity;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE VIEW public_sku_sales_summary AS
SELECT
  id,
  sku_code,
  name,
  category,
  price,
  stock_available,
  stock_sold AS total_sold,
  monthly_sold,
  ROUND(price * stock_sold, 2) AS gross_sales_estimate,
  is_active,
  updated_at
FROM sku
WHERE is_active = TRUE;

GRANT SELECT ON public_sku_sales_summary TO anon, authenticated;
