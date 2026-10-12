// 角色与权限体系（消费者 / 商家运营 / 审核人员 / 管理员）
// 权限不足时页面显示明确提示；服务端通过 RLS（is_merchant/is_admin）双重拦截，
// 不允许仅靠前端隐藏按钮作为唯一权限控制。

import type {UserRole} from '@/db/types'

export type BusinessRole = 'consumer' | 'merchant' | 'reviewer' | 'admin'

// 业务角色标签
export const BUSINESS_ROLE_LABELS: Record<BusinessRole, string> = {
  consumer: '普通消费者',
  merchant: '商家/运营人员',
  reviewer: '审核人员',
  admin: '管理员'
}

/** 数据库角色 → 业务角色 */
export function toBusinessRole(role?: string | null): BusinessRole {
  if (role === 'admin') return 'admin'
  if (role === 'merchant') return 'merchant'
  if (role === 'reviewer') return 'reviewer'
  return 'consumer'
}

/** 是否业务端角色（可访问商家后台） */
export function isBusinessRole(role?: string | null): boolean {
  const r = toBusinessRole(role)
  return r === 'merchant' || r === 'reviewer' || r === 'admin'
}

/** 是否可管理商品/库存/客户/询盘/报价（商家运营+管理员） */
export function canManageBusiness(role?: string | null): boolean {
  const r = toBusinessRole(role)
  return r === 'merchant' || r === 'admin'
}

/** 是否可审核AI生成内容/报价/单证（审核人员+管理员） */
export function canReviewAiContent(role?: string | null): boolean {
  const r = toBusinessRole(role)
  return r === 'reviewer' || r === 'admin'
}

/** 是否系统管理员 */
export function isAdminRole(role?: string | null): boolean {
  return toBusinessRole(role) === 'admin'
}

/** 权限模块定义（商家后台入口可见性） */
export const PERMISSION_MODULE_LABELS: Record<BusinessRole, string[]> = {
  consumer: [],
  merchant: [
    '商品管理',
    'SKU库存管理',
    '订单管理',
    '海外客户CRM',
    '询盘管理',
    '报价管理',
    '贸易单证',
    '售后管理',
    '异常订单',
    'AI业务记录',
    '运营配置中心'
  ],
  reviewer: ['AI内容审核', '报价审核', '贸易单证审核', '营销素材审核', '售后管理', 'AI业务记录'],
  admin: [
    '商品管理',
    'SKU库存管理',
    '订单管理',
    '海外客户CRM',
    '询盘管理',
    '报价管理',
    '贸易合规',
    '贸易单证',
    '售后管理',
    '异常订单',
    'AI业务记录',
    '数据看板',
    '运营配置中心',
    '权限管理'
  ]
}

/** 获取角色可访问模块（用于权限提示页面展示） */
export function getAccessibleModules(role: UserRole | string | null | undefined): string[] {
  return PERMISSION_MODULE_LABELS[toBusinessRole(role)]
}
