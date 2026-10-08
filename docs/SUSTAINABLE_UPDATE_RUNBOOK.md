# 可持续更新运行说明

## 自动更新链路

```text
GitHub Actions 每日 02:00（北京时间）
→ 调用 Supabase trade-data-refresh
→ 抓取 WTO / UNCTAD / 商务部 / WTO 政策页面
→ 计算内容指纹
→ 发现新版本才新增 source_document
→ 保存新的贸易数据版本，不删除旧版本
→ 将引用旧来源的 AI 分析标记为 stale
→ 小程序下次打开时优先读取最新 WTO 快照
```

官方来源没有统一的“新政策事件”推送接口，因此当前采用每日检查。它能自动发现页面内容变化，但不能承诺政策发布后立刻触发。

## GitHub Secrets

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中设置：

- `SUPABASE_TRADE_REFRESH_URL`：部署后的 `trade-data-refresh` Edge Function URL；
- `SUPABASE_ANON_KEY`：Supabase anon key。
- `TRADE_REFRESH_SECRET`：仅用于 GitHub Actions 调用刷新函数的随机长字符串。

工作流文件：`.github/workflows/refresh-trade-data.yml`。

## Supabase Secrets

部署 Edge Function 后，在 Supabase 项目中配置：

- `SUPABASE_SERVICE_ROLE_KEY`：只放在 Edge Function 服务端；
- `AYRSHARE_API_KEY`：只放在 `ayrshare-social` Edge Function 服务端；
- `SUPABASE_ANON_KEY`：用于校验小程序用户 JWT。
- `TRADE_REFRESH_SECRET`：与 GitHub Actions Secret 保持一致。

绝不把上述值写入前端、GitHub 代码或聊天消息。

## 过时分析处理

自动刷新不会直接覆盖历史分析，而是：

1. 保存新数据版本；
2. 保留旧数据和旧分析；
3. 判断 AI 分析引用的来源是否已经变化；
4. 将其标记为 `stale`；
5. 要重新使用时，重新生成并进行人工复核。

这样既能满足“自动更新”，也能在课堂展示中回答“原来的分析是否还有效、为什么被替换”。

## 社交平台安全流程

营销页采用：

```text
生成 IG / FB 文案
→ AI 风险检查
→ 人工审核通过
→ 连接 Ayrshare 社交账号
→ Ayrshare 校验内容
→ 用户再次确认
→ 提交为待审核帖子
→ 后续批准后发布
```

当前代码默认 `requiresApproval: true`，避免把课堂演示或未确认内容直接公开发布。

## 仍需部署的部分

代码已经推送到 GitHub，但以下动作必须在你的 Supabase 项目执行：

- 执行 `00043_sustainable_trade_updates.sql`；
- 执行 `00044_social_profiles.sql`；
- 部署 `trade-data-sync`；
- 部署 `trade-data-refresh`；
- 部署 `ayrshare-social`；
- 设置 Supabase Secrets；
- 设置 GitHub Actions Secrets。

代码提交本身不等于远端 Supabase 已部署，首次部署后应通过工作流的 `Run workflow` 手动测试一次。
