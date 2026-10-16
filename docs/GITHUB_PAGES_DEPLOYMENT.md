# GitHub Pages 部署

正式 H5 網址：<https://ngc1022.github.io/genshu-trade-ai/>

工作流位於 `.github/workflows/deploy-pages.yml`。選擇 GitHub Actions 作為 Pages 發布來源後，推送到 `main` 會自動建置並發布；也可以從 Actions 頁手動執行 `Deploy H5 to GitHub Pages`。

建置使用 Taro H5，Pages 專案路徑為 `/genshu-trade-ai/`。工作流會調整 Taro 產物中的靜態圖片 URL，並在輸出目錄加入 `.nojekyll`。

AI 預設固定為本地 Mock 演示模式，不會呼叫需付費的 MiniMax API。若 GitHub Actions 中配置了 `SUPABASE_ANON_KEY`，建置會以該公開客戶端 key 連接既有 Supabase 專案；若未配置，Supabase 依賴頁面會使用演示回退資料。**不要配置或使用 service-role key 作為前端建置參數。**

GitHub Pages 網站對網際網路公開。修改網站內容後推送到 `main`，工作流會自動重新部署。
