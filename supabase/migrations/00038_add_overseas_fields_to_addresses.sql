-- 支持海外收货地址：国家、海外详细地址、是否海外
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS is_overseas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS overseas_detail text;
