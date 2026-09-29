import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { Aes } from "npm:wechatpay-axios-plugin@0.9.4"

serve(async (req) => {
  const MCH_API_V3_KEY = Deno.env.get('MCH_API_V3_KEY') || ''
  
  try {
    const { resource } = await req.json()
    const { nonce, associated_data, ciphertext } = resource

    const plaintext = await Aes.AesGcm.decrypt(ciphertext, MCH_API_V3_KEY, nonce, associated_data)
    const obj = JSON.parse(plaintext)
    
    const tradeState = obj.trade_state
    const outTradeNo = obj.out_trade_no
    const transactionId = obj.transaction_id
    
    if (tradeState === 'SUCCESS') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 首先尝试作为商品订单更新（新版：支付状态独立 + 幂等）
      const { data: isGoods, error: goodsError } = await supabase.rpc('handle_order_payment_success_v2', {
        p_order_no: outTradeNo,
        p_transaction_no: transactionId,
        p_amount: Number(obj.amount?.total ?? 0) / 100,
        p_currency: obj.amount?.currency ?? 'CNY',
        p_channel: 'wechat_pay'
      })

      if (goodsError || !isGoods) {
        // 如果不是商品订单，尝试作为门票订单更新
        const { data: isTicket, error: ticketError } = await supabase.rpc('handle_ticket_payment_success', {
          p_order_no: outTradeNo,
          p_transaction_id: transactionId
        })

        if (!isTicket) {
          console.warn(`[PaymentCallback] Order ${outTradeNo} not handled as goods or ticket`)
        }
      }
    }

    return new Response(JSON.stringify({ code: "SUCCESS", message: "OK" }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    })

  } catch (err) {
    console.error(`[PaymentCallback ERROR] error=${err?.message || String(err)}`)
    return new Response(JSON.stringify({ code: "FAIL", message: err?.message || String(err) }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    })
  }
})
