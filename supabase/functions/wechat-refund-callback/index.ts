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
    
    const refundStatus = obj.refund_status
    const outTradeNo = obj.out_trade_no
    const outRefundNo = obj.out_refund_no
    const amount = Number(obj.amount.refund) / 100 // 转回元
    
    if (refundStatus === 'SUCCESS') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // 更新退款记录状态为完成
      const { data: refundRecord, error: refundError } = await supabase.from('refunds').update({
        status: 'completed',
        completed_at: NOW(),
        updated_at: NOW(),
        version: version + 1
      }).eq('refund_no', outRefundNo).select().single()
      
      if (!refundError && refundRecord) {
        // 更新订单项的退款金额
        await supabase.rpc('update_item_refund_amount', {
          p_order_no: outTradeNo,
          p_item_index: refundRecord.item_index,
          p_refund_amount: amount
        })
      }
    } else if (refundStatus === 'CLOSED' || refundStatus === 'ABNORMAL') {
       const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase.from('refunds').update({
        status: refundStatus === 'CLOSED' ? 'closed' : 'abnormal',
        updated_at: NOW(),
        version: version + 1
      }).eq('refund_no', outRefundNo)
    }

    return new Response(JSON.stringify({ code: "SUCCESS", message: "OK" }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    })

  } catch (err) {
    console.error(`[RefundCallback ERROR] error=${err?.message || String(err)}`)
    return new Response(JSON.stringify({ code: "FAIL", message: err?.message || String(err) }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    })
  }
})
