# 根书文创微信小程序

## 项目简介

根书文创微信小程序是一个集文创产品购买、文旅门票预约、个性化定制服务于一体的综合服务平台。采用Taro + React + TypeScript技术栈，使用Supabase作为后端服务。

## 核心功能

### 1. 文创产品购买
- 平价文创商品展示（钥匙扣、印章、书签等）
- 高端文创展示（标注定制引导）
- 完整的购物流程（浏览、选择、下单、支付）
- 支持线下自提和快递配送

### 2. 文旅门票预约
- 根书体验+景区参观联名套票
- 根书艺术馆单人体验票
- 电子票券生成
- 二维码核销功能
- 电子纪念票根

### 3. 定制服务
- **3D打印定制**：选择模板、输入文字、快速定制
- **高端实体定制**：提交需求、专业团队量身打造
- 定制进度跟踪

### 4. 管理功能
- 订单管理
- 门票核销
- 定制审核
- 退款管理

## 技术架构

### 前端技术栈
- **框架**：Taro 4.1.10 + React 18.3.1
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **图标**：Material Design Icons (MDI)

### 后端服务
- **数据库**：Supabase PostgreSQL
- **认证**：Supabase Auth（微信登录 + 用户名密码登录）
- **存储**：Supabase Storage
- **Edge Functions**：6个无服务器函数
  - `wechat_miniapp_login`：微信小程序登录
  - `get_wechat_openid`：静默登录获取openid
  - `create_wechat_payment`：创建支付订单
  - `wechat_payment_callback`：支付回调处理
  - `refund_order`：退款处理
  - `wechat_refund_callback`：退款回调处理

### 数据库设计
- **11张核心表**：profiles, sku, ticket_types, addresses, orders, refunds, ticket_orders, tickets, customization_orders等
- **8个枚举类型**：user_role, order_status, refund_status, delivery_method等
- **6个RPC函数**：库存管理、退款计算等
- **完整的RLS策略**：用户和管理员权限控制

## 设计风格

采用中国传统文化风格的色彩系统：
- **主色调**：中国红 (#C92A2A)
- **辅助色**：金色 (#FFD700)
- **渐变效果**：优雅的渐变背景和阴影
- **现代设计**：圆角卡片、流畅动画、响应式布局

## 项目结构

```
src/
├── pages/              # 24个页面
│   ├── home/          # 首页
│   ├── login/         # 登录页
│   ├── products/      # 商品列表
│   ├── product-detail/# 商品详情
│   ├── customization/ # 定制服务
│   ├── profile/       # 个人中心
│   └── ...           # 其他页面
├── contexts/          # React Context
│   └── AuthContext.tsx
├── components/        # 公共组件
│   └── RouteGuard.tsx
├── db/               # 数据库相关
│   ├── types.ts      # 类型定义
│   └── api.ts        # API函数
└── client/           # 客户端配置
    └── supabase.ts

supabase/
├── migrations/       # 数据库迁移
└── functions/        # Edge Functions
    ├── wechat_miniapp_login/
    ├── get_wechat_openid/
    ├── create_wechat_payment/
    ├── wechat_payment_callback/
    ├── refund_order/
    └── wechat_refund_callback/
```

## 配置说明

### 1. 微信支付配置

需要在Supabase后台配置以下6个Secrets：

- `WECHAT_APPID`：微信小程序AppID
- `WECHAT_APP_SECRET`：微信小程序AppSecret
- `WECHAT_MCHID`：微信支付商户号
- `WECHAT_API_V3_KEY`：微信支付APIv3密钥
- `WECHAT_SERIAL_NO`：微信支付API证书序列号
- `WECHAT_PRIVATE_KEY`：微信支付API私钥内容

### 2. 权限说明

- **首次注册用户**：自动成为管理员
- **普通用户**：可以浏览商品、购买、查看订单
- **管理员**：拥有订单管理、门票核销、定制审核、退款管理等权限

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（微信小程序）
pnpm dev:weapp

# 开发模式（H5）
pnpm dev:h5

# 构建
pnpm build:weapp
pnpm build:h5

# 代码检查
pnpm lint
```

## 功能状态

### 已完成
- ✅ 完整的数据库架构
- ✅ 用户认证系统
- ✅ 支付和退款Edge Functions
- ✅ 核心页面（首页、商品、定制、个人中心）
- ✅ TabBar图标和商品图片
- ✅ 中国传统文化风格设计

### 待完善
部分页面使用了简化版本，可根据实际需求进一步完善：
- 订单确认、订单列表、订单详情
- 门票列表、门票详情、门票购买、我的门票、门票核销
- 3D定制、高端定制、定制订单列表、定制详情
- 地址管理
- 管理员功能页面

## 注意事项

1. **支付功能**：需要配置微信支付商户号和相关证书
2. **图片资源**：商品图片已从网络搜索并更新到数据库
3. **权限控制**：首次登录用户自动成为管理员
4. **退款功能**：支持完整的部分退款流程
5. **门票核销**：使用二维码扫描核销

## 版权信息

© 2026 根书文创
