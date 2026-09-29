import { createClient } from 'jsr:@supabase/supabase-js';
import { Aes } from "npm:wechatpay-axios-plugin@0.9.4";
import ShortUniqueId from "npm:short-unique-id";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const generateTicketNo = () => `TKT-${new Date().toISOString().slice(2,10).replace(/-/g,"")}-${new ShortUniqueId({length:8}).rnd()}`;

async function decryptTradeState(MCH_API_V3_KEY: string, associatedData: string, nonce: string, ciphertext: string): Promise<{ tradeState: string; outTradeNo: string; transactionId: string; totalAmount: number }> {
  const plaintext = await Aes.AesGcm.decrypt(ciphertext, MCH_API_V3_KEY, nonce, associatedData);
  const obj = JSON.parse(plaintext);
  return {
    tradeState: (obj.trade_state ?? "") === "SUCCESS" ? "SUCCESS" : "OTHERS",
    outTradeNo: obj.out_trade_no ?? "",
    transactionId: obj.transaction_id ?? "",
    totalAmount: (obj.amount?.total ?? 0) / 100
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

    // 解密支付结果
    const { tradeState, outTradeNo, transactionId, totalAmount } = await decryptTradeState(
      MCH_API_V3_KEY,
      resource.associated_data,
      resource.nonce,
      resource.ciphertext
    );

    console.log(`[Payment Callback] orderNo=${outTradeNo}, tradeState=${tradeState}, transactionId=${transactionId}`);

    if (tradeState !== 'SUCCESS') {
      return new Response(JSON.stringify({ code: 'SUCCESS' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 判断订单类型
    let orderType = 'product';
    if (outTradeNo.startsWith('ORD-')) {
      // 检查是否为商品订单
      const { data: productOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_no', outTradeNo)
        .single();

      if (productOrder) {
        orderType = 'product';
      } else {
        // 检查是否为门票订单
        const { data: ticketOrder } = await supabaseAdmin
          .from('ticket_orders')
          .select('*')
          .eq('order_no', outTradeNo)
          .single();

        if (ticketOrder) {
          orderType = 'ticket';
        } else {
          // 检查是否为定制订单
          const { data: customOrder } = await supabaseAdmin
            .from('customization_orders')
            .select('*')
            .eq('order_no', outTradeNo)
            .single();

          if (customOrder) {
            orderType = 'customization';
          }
        }
      }
    }

    if (orderType === 'product') {
      // 处理商品订单
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_no', outTradeNo)
        .single();

      if (!order) {
        console.error(`[Payment Callback] Order not found: ${outTradeNo}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 检查订单状态，避免重复处理
      if (order.status !== 'pending') {
        console.log(`[Payment Callback] Order already processed: ${outTradeNo}, status=${order.status}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 更新订单状态
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          wechat_transaction_id: transactionId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_no', outTradeNo)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError || !updatedOrder) {
        console.log(`[Payment Callback] Order already updated by another callback: ${outTradeNo}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 确认库存
      for (const item of order.items) {
        await supabaseAdmin.rpc('confirm_sku_stock', {
          p_sku_code: item.sku_code,
          p_quantity: item.quantity
        });
      }

    } else if (orderType === 'ticket') {
      // 处理门票订单
      const { data: ticketOrder } = await supabaseAdmin
        .from('ticket_orders')
        .select('*')
        .eq('order_no', outTradeNo)
        .single();

      if (!ticketOrder) {
        console.error(`[Payment Callback] Ticket order not found: ${outTradeNo}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (ticketOrder.status !== 'pending') {
        console.log(`[Payment Callback] Ticket order already processed: ${outTradeNo}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 更新门票订单状态
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('ticket_orders')
        .update({
          status: 'paid',
          wechat_transaction_id: transactionId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_no', outTradeNo)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError || !updatedOrder) {
        console.log(`[Payment Callback] Ticket order already updated: ${outTradeNo}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 确认库存
      await supabaseAdmin.rpc('confirm_ticket_stock', {
        p_ticket_type_id: ticketOrder.ticket_type_id,
        p_quantity: ticketOrder.quantity
      });

      // 生成门票
      const { data: ticketType } = await supabaseAdmin
        .from('ticket_types')
        .select('validity_days')
        .eq('id', ticketOrder.ticket_type_id)
        .single();

      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (ticketType?.validity_days || 30));

      const tickets = [];
      for (let i = 0; i < ticketOrder.quantity; i++) {
        const ticketNo = generateTicketNo();
        tickets.push({
          ticket_no: ticketNo,
          order_id: ticketOrder.id,
          user_id: ticketOrder.user_id,
          ticket_type_id: ticketOrder.ticket_type_id,
          qr_code: ticketNo, // 使用票号作为二维码内容
          status: 'unused',
          valid_from: validFrom.toISOString(),
          valid_until: validUntil.toISOString()
        });
      }

      await supabaseAdmin.from('tickets').insert(tickets);

    } else if (orderType === 'customization') {
      // 处理定制订单
      const { data: customOrder } = await supabaseAdmin
        .from('customization_orders')
        .select('*')
        .eq('order_no', outTradeNo)
        .single();

      if (!customOrder) {
        console.error(`[Payment Callback] Customization order not found: ${outTradeNo}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (customOrder.status !== 'pending') {
        console.log(`[Payment Callback] Customization order already processed: ${outTradeNo}`);
        return new Response(JSON.stringify({ code: 'SUCCESS' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 更新定制订单状态
      const { error: updateError } = await supabaseAdmin
        .from('customization_orders')
        .update({
          status: 'reviewing',
          wechat_transaction_id: transactionId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_no', outTradeNo)
        .eq('status', 'pending');

      if (updateError) {
        console.log(`[Payment Callback] Customization order already updated: ${outTradeNo}`);
      }
    }

    return new Response(JSON.stringify({ code: 'SUCCESS' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[wechat_payment_callback ERROR]', err);
    return new Response(JSON.stringify({ code: 'FAIL', message: err?.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
