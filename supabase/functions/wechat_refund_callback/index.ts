import { createClient } from 'jsr:@supabase/supabase-js';
import { Aes } from "npm:wechatpay-axios-plugin@0.9.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function decryptRefundState(MCH_API_V3_KEY: string, associatedData: string, nonce: string, ciphertext: string): Promise<{ refundStatus: string; outTradeNo: string; outRefundNo: string; refundAmount: number }> {
  const plaintext = await Aes.AesGcm.decrypt(ciphertext, MCH_API_V3_KEY, nonce, associatedData);
  const obj = JSON.parse(plaintext);
  return {
    refundStatus: obj.refund_status ?? "",
    outTradeNo: obj.out_trade_no ?? "",
    outRefundNo: obj.out_refund_no ?? "",
    refundAmount: (obj.amount?.refund ?? 0) / 100
  };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { resource } = body;

    if (!resource) {
      return new Response(JSON.stringify({ code: 'FAIL', message: '缺少resource' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const MCH_API_V3_KEY = Deno.env.get("MCH_API_V3_KEY");
    if (!MCH_API_V3_KEY) {
      return new Response(JSON.stringify({ code: 'FAIL', message: '缺少MCH_API_V3_KEY配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 解密退款结果
    const { refundStatus, outTradeNo, outRefundNo, refundAmount } = await decryptRefundState(
      MCH_API_V3_KEY,
      resource.associated_data,
      resource.nonce,
      resource.ciphertext
    );

    console.log(`[Refund Callback] refundNo=${outRefundNo}, status=${refundStatus}, amount=${refundAmount}`);

    // 获取退款记录
    const { data: refund } = await supabaseAdmin
      .from('refunds')
      .select('*')
      .eq('refund_no', outRefundNo)
      .single();

    if (!refund) {
      console.error(`[Refund Callback] Refund not found: ${outRefundNo}`);
      return new Response(JSON.stringify({ code: 'SUCCESS' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查退款状态，避免重复处理
    if (refund.status === 'completed' || refund.status === 'closed') {
      console.log(`[Refund Callback] Refund already processed: ${outRefundNo}, status=${refund.status}`);
      return new Response(JSON.stringify({ code: 'SUCCESS' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (refundStatus === 'SUCCESS') {
      // 退款成功
      const { data: updatedRefund, error: updateError } = await supabaseAdmin
        .from('refunds')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('refund_no', outRefundNo)
        .eq('status', 'processing')
        .select()
        .single();

      if (updateError || !updatedRefund) {
        console.log(`[Refund Callback] Refund already updated: ${outRefundNo}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 更新订单退款金额
      await supabaseAdmin.rpc('update_item_refund_amount', {
        p_order_no: refund.order_no,
        p_item_index: refund.item_index,
        p_refund_amount: refund.refund_amount
      });

      // 检查订单是否全部退款
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_no', refund.order_no)
        .single();

      if (order && order.refunded_amount >= order.total_amount) {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString()
          })
          .eq('order_no', refund.order_no);
      }

    } else if (refundStatus === 'CLOSED') {
      // 退款关闭
      await supabaseAdmin
        .from('refunds')
        .update({
          status: 'closed',
          admin_note: '微信退款已关闭',
          updated_at: new Date().toISOString()
        })
        .eq('refund_no', outRefundNo);

    } else if (refundStatus === 'ABNORMAL') {
      // 退款异常
      await supabaseAdmin
        .from('refunds')
        .update({
          status: 'abnormal',
          admin_note: '微信退款异常',
          updated_at: new Date().toISOString()
        })
        .eq('refund_no', outRefundNo);
    }

    return new Response(JSON.stringify({ code: 'SUCCESS' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[wechat_refund_callback ERROR]', err);
    return new Response(JSON.stringify({ code: 'FAIL', message: err?.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
