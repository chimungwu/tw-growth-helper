# 🦒 台灣兒童生長曲線小幫手 (Taiwan Child Growth Helper)

一款專為台灣家長設計的輕量化兒童生長數據追蹤工具。即時計算百分位，掌握孩子成長進度。

![PWA Icon](ICON.png)

## 🌟 核心特色

- **即時百分位計算**：輸入身高、體重與年齡，立即對照衛福部標準計算百分位。
- **BMI 健康分析**：自動計算 BMI 並評估是否在同年齡層的健康範圍。
- **成年目標身高預估**：根據父母身高，使用遺傳公式預估孩子未來的目標身高。
- **PWA 行動支援**：支援「加入主畫面」，安裝後可像原生 App 一樣快速開啟，且支援離線使用。
- **隱私保護**：所有數據僅在您的瀏覽器中進行本地計算，不收集、不儲存任何個人隱私數據。

## 🛠️ 技術棧 (Tech Stack)

- **前端框架**: React 18 (TypeScript)
- **構建工具**: Vite
- **樣式處理**: Tailwind CSS
- **圖示庫**: Lucide React
- **離線支援**: Vite PWA Plugin

## 🚀 快速開始 (Quick Start)

### 本地開發環境設定

1. **複製專案**:
   ```bash
   git clone https://github.com/你的帳號/tw-growth-helper.git
   ```

2. **安裝依賴**:
   ```bash
   npm install
   ```

3. **啟動開發伺服器**:
   ```bash
   npm run dev
   ```

## 📦 部署到 GitHub Pages

1. 在 `vite.config.ts` 中，確保 `base` 路徑正確（對應您的 Repository 名稱）：
   ```typescript
   export default defineConfig({
     base: '/tw-growth-helper/',
     // ...
   });
   ```

2. 執行構建：
   ```bash
   npm run build
   ```

3. 將 `dist` 資料夾內容推送至 GitHub 的 `gh-pages` 分支。

## 📊 資料來源

- **衛生福利部國民健康署**：[兒童生長曲線圖](https://www.hpa.gov.tw/Pages/List.aspx?nodeid=1139)
- **世界衛生組織 (WHO)**：兒童生長標準參考。

---
製作：[你的名字/GitHub 帳號]
