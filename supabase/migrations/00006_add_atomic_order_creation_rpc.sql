-- 商品下单 RPC
CREATE OR REPLACE FUNCTION create_goods_order(
  p_user_id uuid,
  p_openid text,
  p_items jsonb,
  p_total_amount numeric,
  p_delivery_method text,
  p_address_id uuid DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_pickup_date text DEFAULT NULL,
  p_pickup_time text DEFAULT NULL,
  p_remark text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders;
  v_order_no text;
BEGIN
  -- 生成订单号
  v_order_no := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 8);
  
  -- 1. 冻结库存
  PERFORM public.freeze_sku_stock(p_items);
  
  -- 2. 插入订单
  INSERT INTO public.orders (
    order_no, user_id, openid, items, total_amount, 
    delivery_method, address_id, pickup_location, pickup_date, pickup_time, remark,
    status
  ) VALUES (
    v_order_no, p_user_id, p_openid, p_items, p_total_amount,
    p_delivery_method::public.delivery_method, p_address_id, p_pickup_location, p_pickup_date, p_pickup_time, p_remark,
    'pending'
  ) RETURNING * INTO v_order;
  
  RETURN v_order;
END;
$$;

-- 门票下单 RPC
CREATE OR REPLACE FUNCTION create_ticket_order_v2(
  p_user_id uuid,
  p_openid text,
  p_ticket_type_id uuid,
  p_quantity int,
  p_unit_price numeric,
  p_total_amount numeric,
  p_visitor_name text,
  p_visitor_phone text,
  p_visit_date date
)
RETURNS public.ticket_orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.ticket_orders;
  v_order_no text;
  v_i int;
BEGIN
  -- 生成订单号
  v_order_no := 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 8);
  
  -- 1. 插入订单
  INSERT INTO public.ticket_orders (
    order_no, user_id, openid, ticket_type_id, quantity, unit_price, total_amount,
    visitor_name, visitor_phone, visit_date, status
  ) VALUES (
    v_order_no, p_user_id, p_openid, p_ticket_type_id, p_quantity, p_unit_price, p_total_amount,
    p_visitor_name, p_visitor_phone, p_visit_date, 'pending'
  ) RETURNING * INTO v_order;
  
  -- 2. 插入门票详情 (初始状态为待支付，所以 status 设置为 pending)
  -- 注意：之前的 tickets 表可能有不同的 status 枚举值。通常是 unused/used/expired。
  -- 这里我们需要确保 tickets 表中也有一个支付状态，或者在支付成功后再插入 tickets。
  -- 根据 handle_ticket_payment_success，它是支付成功后将 tickets 状态改为 'unused'。
  -- 那么我们需要在下单时插入状态为 'pending' 的 tickets。
  FOR v_i IN 1..p_quantity LOOP
    INSERT INTO public.tickets (
      ticket_no, order_no, user_id, ticket_type_id, status,
      valid_from, valid_until, qr_code
    ) VALUES (
      'TN-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 10),
      v_order_no, p_user_id, p_ticket_type_id, 'pending', -- 假设有 pending 状态，或者用其他的表示待支付
      p_visit_date::timestamp, (p_visit_date + interval '1 day')::timestamp,
      substring(md5(random()::text) from 1 for 16)
    );
  END LOOP;
  
  RETURN v_order;
END;
$$;
