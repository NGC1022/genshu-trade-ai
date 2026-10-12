# TODO: 根书文创小程序第二十二次迭代

## 计划
- [x] 数据库迁移与初始化
  - [x] 更新 `ticket_types` 数据（乐山大佛、联票、讲解服务）
  - [x] 创建 `digital_ips` 表并插入初始数据
  - [x] 扩展 `profiles` 表以支持会员体系
  - [x] 创建 `coupons` 和 `user_coupons` 表
  - [x] 创建 `exclusive_content` 表
  - [x] 创建 `three_d_templates` 表并插入4种固定模板
- [x] 后端 API 实现
  - [x] 实现数字IP获取 API
  - [x] 实现会员中心相关 API（注册、权益、专属内容）
  - [x] 实现优惠券相关 API
  - [x] 实现 3D 打印模板获取 API
- [x] 前端页面实现与调整
  - [x] 门票模块：更新 `pages/tickets/index` 票种展示与计算
  - [x] 数字IP模块：创建 `pages/digital-ip/index` 页面
  - [x] 会员模块：创建 `pages/member-center/index` 页面
  - [x] 会员模块：创建 `pages/exclusive-content/index` 页面
  - [x] 3D打印模块：更新 `pages/customization/index`（缩减模板、字数限制、移除备注）
  - [x] 个人中心：更新 `pages/profile/index` 添加会员入口
  - [x] 首页：更新 `pages/home/index` 添加数字IP和会员入口
- [x] 视觉与交互优化
  - [x] 使用 `image_search` 搜索相关的 IP 形象和文创图片
  - [x] 使用 `mini_program_icon_rag` 生成新增板块的图标
- [x] 测试与 Lint 检查
  - [x] 执行 `npm run lint` 并修复问题
  - [x] 验证全流程功能正确性

## 备注
- 3D 打印字数限制：最多 5 个汉字。
- 门票价格：成人票 80，联票 88，讲解单购 20。
- 数字 IP 板块参考“关于我们”风格。
