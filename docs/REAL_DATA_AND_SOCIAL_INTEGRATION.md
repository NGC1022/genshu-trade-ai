# 真实数据与 Instagram/Facebook 接入说明

## 真实贸易数据

本项目新增 `supabase/functions/trade-data-sync/index.ts`，从 WTO Digitally Delivered Services Trade Dataset 的公开压缩数据读取真实年度数据。当前同步函数覆盖中国、美国、日本、新加坡和韩国，并输出：

- 经济体；
- 年份；
- 数字化交付服务出口；
- 当前美元金额；
- WTO 来源和定义；
- 同步日期。

市场分析页打开时优先请求实时 WTO 快照；请求失败时回退到已核验的课堂快照，并在页面上明确显示“WTO实时快照”或“课堂快照”。保存 AI 分析时会记录快照 ID，便于课堂展示解释“AI到底依据了什么数据”。

WTO 数据覆盖数字化交付服务，不等于跨境电商货物，也不等于所有可数字化交付服务。系统不会把这几个口径直接相加。

## Instagram / Facebook

Instagram Graph API 的官方路径要求专业账号（Business 或 Creator），并涉及 Meta 登录、关联 Facebook Page、权限审核和 Token 管理。Facebook 发布通常面向 Page/Business 场景，不是普通个人账号的任意自动发布。

项目集成应采用以下安全架构：

```text
小程序生成待发布内容
→ 用户在官方 OAuth 页面授权
→ 服务器保存短期/长期 Token（不进前端）
→ 发布前显示预览、平台、文案和图片
→ 用户确认后由服务端发布
→ 回写平台 Post ID 和分析数据
```

当前会话发现了可统一覆盖 Instagram 与 Facebook 的 Ayrshare 连接器，也发现了 Buffer 等多平台选项，但它们尚未授权。未完成授权之前，代码不会假装已经能够发布，也不会向用户索要密码或 Access Token。

发布、删除、发送私信和广泛公开传播属于外部高影响操作；系统应先展示最终内容和目标平台，再由用户确认。
