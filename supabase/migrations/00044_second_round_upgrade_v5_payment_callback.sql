-- 同步旧版微信支付成功 RPC 的 payment_status 字段，并增强回调兼容性
CREATE OR REPLACE FUNCTION handle_order_payment_success(p_order_no text, p_transaction_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status order_status;
  v_items jsonb;
BEGIN
  -- 获取订单当前状态和商品列表
  SELECT status, items INTO v_order_status, v_items FROM public.orders WHERE order_no = p_order_no FOR UPDATE;

  IF v_order_status IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_order_status = 'pending' THEN
    -- 更新订单状态与支付状态
    UPDATE public.orders
    SET status = 'paid',
        payment_status = 'paid',
        wechat_transaction_id = p_transaction_id,
        paid_at = COALESCE(paid_at, NOW()),
        updated_at = NOW(),
        version = version + 1
    WHERE order_no = p_order_no;

    -- 转换库存
    PERFORM convert_sku_stock(v_items);

    RETURN TRUE;
  END IF;

  RETURN FALSE; -- 已经是支付状态或订单不可用
END;
$$;
