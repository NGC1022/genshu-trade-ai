# 可持续更新运行说明

## 数据链路

```text
看板/市场分析页打开或手动刷新
→ Supabase trade-data-sync 检查最近24小时的 WTO 缓存
→ 缓存过期时下载 WTO 官方压缩文件并解析 DDS 总出口行
→ 保存新版本到 trade_data_versions（数据库缓存失败时仍尽量返回已抓取数据）
→ 页面按经济体和年份合并，实时值覆盖相同年度课堂快照
```

`trade-data-sync` 的自动刷新仅覆盖 WTO Digitally Delivered Services 数据。中国海关跨境电商和商务部服务贸易/数字贸易数值目前是经人工核对的官方快照；不把网页抓取或定时任务伪称为实时接口。

GitHub Actions 工作流 `.github/workflows/refresh-trade-data.yml` 每日 UTC 18:00（北京时间次日 02:00）可调用 `trade-data-refresh`，并提供 `workflow_dispatch` 手动运行入口。该工作流只有在配置全部 Secrets 后才会成功；它负责检查可持续贸易数据/政策来源，不替代 WTO 图表同步接口，也不保证来源发布后即时触发。

## GitHub Actions Secrets

在仓库 Settings → Secrets and variables → Actions 配置：

- `SUPABASE_TRADE_REFRESH_URL`：部署后的 `trade-data-refresh` Edge Function 完整 URL；
- `SUPABASE_ANON_KEY`：该 Supabase 项目的 anon key；
- `TRADE_REFRESH_SECRET`：仅供 GitHub Actions 调用刷新函数校验的长随机值。

不要把 Secret 写入 workflow 文件、前端变量或聊天记录。配置后可用 `workflow_dispatch` 手动测试，并检查执行结果。

## Supabase Edge Function Secrets

按实际部署设置：

- `INTEGRATIONS_API_KEY`：模型网关 `minimax-chat`、现有 geocoding 网关调用；仅服务端使用；
- `SUPABASE_SERVICE_ROLE_KEY`：`ayrshare-social` 等需要管理员操作的 Edge Function；绝不提供给前端；
- `SUPABASE_ANON_KEY`：部分 Edge Function 用来验证调用方 JWT；
- `AYRSHARE_API_KEY`：服务端社交发布代理；
- `TRADE_REFRESH_SECRET`：与 GitHub Actions Secret 保持一致。

Google Maps 尚未接入当前地理编码代码。若后续采用 Google Maps Platform，需单独取得并限制 Google API Key、启用目标 API 和账单；不要复用或暴露 `INTEGRATIONS_API_KEY`。中国大陆应保留微信/国内地图能力作为地区适配，不把 Google Maps 当成唯一方案。

## Supabase 数据库与 Functions 部署

按该项目尚未执行的迁移依次核对并部署；迁移应用记录以 Supabase 实际状态为准：

- `00043_sustainable_trade_updates.sql`：贸易来源版本表/相关策略；
- `00044_social_profiles.sql`：Ayrshare 社交资料；
- `00046_private_ai_trade_exports.sql`：私有化 `exports` 桶并限制文件路径为当前用户。

部署需要的 Edge Functions：

- `trade-data-sync`：WTO 官方 CSV/XLSX 同步与 24 小时缓存；
- `trade-data-refresh`：定时检查来源/政策变化；
- `minimax-chat`：远端 MiniMax-M3 市场分析；
- `export-ai-trade-records`：生成用户私有 Excel 并返回 5 分钟签名链接；
- `ayrshare-social`：仅在已接入 Ayrshare 后部署与使用。

客户端仅使用 Supabase URL 和 anon public key；AI、Storage 管理和刷新鉴权所需 Secret 只能存在服务端。

## 记录的证据与陈旧处理

市场分析保存时会写入当时采用的统计数值、年份、单位、来源链接、抓取时间和指标局限。新同步数据不覆盖旧分析；旧记录没有结构化证据时，Excel 会标注证据未保存。若来源更新影响旧分析，应重新生成并进行人工复核，不能把旧结论自动解释为当前事实。

## 课堂发布检查

- WTO 同步成功后，确认五个重点市场各年值没有与课堂快照重复，静态值已由相同经济体/年份的新值覆盖；
- 确认跨境电商、服务贸易、数字化交付服务三种指标分开显示，单位和来源可见；
- 用 CSV 检查数值、单位、定义、原始 URL、抓取时间；
- 登录用户导出 Excel 后，确认签名 URL 短时有效，其他用户无法访问；
- 若无 Supabase 部署/密钥，界面必须显示静态快照或演示状态，不应称为实时；
- 尚未完成的 Google Maps 与 Meta/Ayrshare OAuth 明确标注为待授权，不在演示中声称已上线。
