// AI跨境贸易助手：演示数据（课堂演示用，全部明确标注）
// 来源规则：仅使用真实存在的商城商品（SKU-BOOK-001 根书书签套装 等）

import type {ProductIntlInput} from './types'

/** 演示商品：根书木质书签（对应商城真实商品 SKU-BOOK-001 根书书签套装） */
export const DEMO_PRODUCT: ProductIntlInput = {
  productId: 'SKU-BOOK-001',
  name: '根书木质书签',
  description:
    '精美根书书签套装，5枚装。精选天然木材，采用四川非遗根书工艺手工制作，将树根的自然形态与传统书法艺术融为一体，每一枚书签都是独特的艺术品。',
  category: 'regular',
  price: 39.9,
  material: '天然木材',
  specification: '5枚装',
  culturalBackground:
    '根书是四川省非物质文化遗产，以树根为笔、自然为师，通过选根、蒸煮、去皮、打磨、拼接等十余道工序，将天然树根创作成书法作品。'
}

/** 演示目标市场 */
export const DEMO_MARKET = '美国'

/** 演示询盘（英文原询盘） */
export const DEMO_INQUIRY = `Hello, I am interested in your Root Calligraphy wooden bookmarks. We would like to purchase 100 pieces for a cultural event. Could you please provide the wholesale price and estimated delivery time?`

/** 演示报价参数（与询盘对应） */
export const DEMO_QUOTE_INPUT = {
  productName: '根书木质书签',
  quantity: 100,
  destination: '美国',
  currency: 'USD',
  unitPrice: 39.9,
  shippingCost: 200,
  otherCost: 0,
  remark: '课堂演示：文化活动现场采购'
}

/** 演示输入标记：所有演示数据页面上必须显示的标记 */
export const DEMO_BADGE_TEXT = '课堂演示数据'
