import type {SKU, TicketType} from '@/db/types'

// 数据库尚未连接或商品表为空时使用的课堂/预览目录。
// 商品字段与 supabase 的 sku 表保持一致，数据库恢复后会自动优先使用线上数据。
const PRODUCT_IMAGES = [
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_56bef55f-8db0-4be0-ae82-b856e5c27013.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_d4b942e4-8cd2-4422-9d32-8840e287a1d0.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_9d0dcb15-739e-4d60-854d-3f1e168ba65f.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_ba4ba8b8-f8b6-46d2-a44d-18b2b5f319ec.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a8d03a4-978b-4d76-a5bc-38afffb68702.jpg'
]

const createdAt = '2026-01-01T00:00:00.000Z'

export const DEMO_CATALOG: SKU[] = [
  {
    id: 'demo-sku-key-001',
    sku_code: 'SKU-KEY-001',
    name: '根书钥匙扣·福',
    description: '将根书书法与日常随身饰物结合，适合作为文化礼赠。',
    category: 'regular',
    price: 29.9,
    image_url: PRODUCT_IMAGES[0],
    stock_available: 100,
    stock_reserved: 0,
    stock_sold: 286,
    monthly_sold: 42,
    is_active: true,
    material: '木质与金属挂件',
    origin: '中国',
    lead_time: '3—5个工作日',
    created_at: createdAt,
    updated_at: createdAt
  },
  {
    id: 'demo-sku-key-002',
    sku_code: 'SKU-KEY-002',
    name: '根书钥匙扣·喜',
    description: '以传统喜字和自然根纹为灵感的轻量文创单品。',
    category: 'regular',
    price: 29.9,
    image_url: PRODUCT_IMAGES[1],
    stock_available: 100,
    stock_reserved: 0,
    stock_sold: 241,
    monthly_sold: 36,
    is_active: true,
    material: '木质与金属挂件',
    origin: '中国',
    lead_time: '3—5个工作日',
    created_at: createdAt,
    updated_at: createdAt
  },
  {
    id: 'demo-sku-book-001',
    sku_code: 'SKU-BOOK-001',
    name: '根书木质书签套装',
    description: '5枚装根书书签，保留天然木材纹理，适合文化交流礼赠和批量采购。',
    category: 'regular',
    price: 39.9,
    image_url: PRODUCT_IMAGES[2],
    stock_available: 80,
    stock_reserved: 0,
    stock_sold: 418,
    monthly_sold: 68,
    is_active: true,
    material: '天然木材',
    dimensions: '约150 × 35 mm',
    origin: '中国',
    lead_time: '5—7个工作日',
    created_at: createdAt,
    updated_at: createdAt
  },
  {
    id: 'demo-sku-badge-001',
    sku_code: 'SKU-BADGE-001',
    name: '根宝数字IP徽章',
    description: '根宝IP形象徽章，适合作为活动伴手礼和会员礼物。',
    category: 'regular',
    price: 49,
    image_url: PRODUCT_IMAGES[3],
    stock_available: 120,
    stock_reserved: 0,
    stock_sold: 192,
    monthly_sold: 31,
    is_active: true,
    material: '合金珐琅',
    origin: '中国',
    lead_time: '3—5个工作日',
    created_at: createdAt,
    updated_at: createdAt
  },
  {
    id: 'demo-sku-premium-001',
    sku_code: 'SKU-PREMIUM-001',
    name: '根书艺术摆件·定制款',
    description: '结合自然根形与书法艺术的高端实体定制作品，当前提供需求评估。',
    category: 'premium',
    price: 899,
    image_url: PRODUCT_IMAGES[4],
    stock_available: 0,
    stock_reserved: 0,
    stock_sold: 18,
    monthly_sold: 3,
    is_active: true,
    material: '天然树根与手工书法',
    origin: '中国',
    lead_time: '15—30个工作日',
    created_at: createdAt,
    updated_at: createdAt
  }
]

export const DEMO_TICKET_TYPES: TicketType[] = [
  {
    id: 'demo-ticket-adult',
    name: '根书文创园成人票',
    description: '参观根书文创园及核心展陈空间，适合首次到访游客。',
    price: 80,
    original_price: 98,
    validity_days: 30,
    usage_notes: '凭购票二维码与有效证件入园。',
    image_url: PRODUCT_IMAGES[4],
    stock_available: 999,
    stock_reserved: 0,
    stock_sold: 128,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt
  },
  {
    id: 'demo-ticket-combo',
    name: '根书文创园文化联票',
    description: '包含园区参观与专题讲解服务，适合家庭和文化考察。',
    price: 88,
    original_price: 108,
    validity_days: 30,
    usage_notes: '讲解场次需提前预约，具体以订单页面为准。',
    image_url: PRODUCT_IMAGES[0],
    stock_available: 999,
    stock_reserved: 0,
    stock_sold: 96,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt
  },
  {
    id: 'demo-ticket-guide',
    name: '专题讲解服务',
    description: '由文化讲解员带领了解根书文化、园区建筑与文创设计。',
    price: 20,
    validity_days: 30,
    usage_notes: '需与入园票同时使用。',
    image_url: PRODUCT_IMAGES[2],
    stock_available: 999,
    stock_reserved: 0,
    stock_sold: 54,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt
  }
]

export function getDemoSKU(skuCode: string): SKU | null {
  return DEMO_CATALOG.find((item) => item.sku_code === skuCode) || null
}
