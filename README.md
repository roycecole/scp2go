# SCP 指令產生器（scp2go）

在瀏覽器端產生正確的 `scp` / `rsync` / `ssh` 指令，複製到你自己的終端機執行。純前端、無後端、不上傳任何檔案、不連線任何主機 —— 檔案內容、金鑰、密碼一律不會離開瀏覽器。

## 特色

- 自動處理易錯細節：scp 的 `-P`（大寫 port）與 ssh/rsync 的 `-p`（小寫 port）、`-i` 金鑰、`-r` 遞迴、遠端目錄建立、SSH 金鑰權限（600/700，Windows 為 `icacls`）修正。
- 依 Windows / macOS·Linux 切換本機路徑格式與引號規則。
- 上傳 ↔ 下載雙向：上傳拖曳本機檔案；下載手動輸入遠端檔名（瀏覽器無法瀏覽遠端檔案系統）。
- 連線測試指令、`~/.ssh/config` Host 區塊產生器、rsync `--dry-run` 預覽模式。
- 具名連線設定檔：儲存、切換、刪除多組連線設定。
- scp ↔ rsync 切換；「Oracle Ubuntu 預設」與「上傳 SSH 金鑰」快捷預設。
- 淺色 / 深色 / 跟隨系統主題；繁體中文 / English 雙語；響應式版面（手機寬度可用）。
- 支援 PWA：可安裝、離線快取（僅限透過 http(s) 存取時；`file://` 開啟時會跳過，不影響一般使用）。
- 依連線速度決定是否載入 Google Fonts（Roboto / Noto Sans TC / JetBrains Mono），避免拖慢慢速連線。
- 最佳努力的 `localStorage` 記憶上次輸入。

## 開發

```bash
npm install
npm run dev
```

## 測試

核心指令產生邏輯（`src/lib/commandBuilder.js`）與狀態管理（`src/state/reducer.js`）有 Vitest 單元測試覆蓋，包含規格書 §5.4 範例的逐字元比對：

```bash
npm test
```

## 建置

```bash
npm run build
```

輸出為 `dist/index.html` **單一檔案**（JS/CSS 皆內嵌），可直接用瀏覽器開啟，也可部署到任何靜態主機；另附 PWA 所需的 `manifest.webmanifest`、`sw.js` 與圖示等獨立檔案（不會被內嵌，也不影響單檔開啟）。

## 部署到 GitHub Pages

推送到 `main` 分支會自動觸發 `.github/workflows/deploy.yml` 建置並部署（首次使用前，請到 repo 的 Settings → Pages → Source 選擇 "GitHub Actions"）。

也可以手動部署：

1. `npm run build`
2. 將 `dist/` 內容推送到 GitHub Pages 所使用的分支，或直接透過 GitHub Actions 面板手動觸發 workflow。

**部署後請務必更新以下檔案中的預留網址**（目前為 `https://your-username.github.io/scp2go/` 佔位符）：`index.html`（canonical / OG / Twitter 標籤）、`public/robots.txt`、`public/sitemap.xml`。

## 本機直接開啟

`dist/index.html` 建置後不依賴伺服器，可直接在瀏覽器開啟（例如雙擊檔案）離線使用。

## 已知限制

- 瀏覽器安全限制下無法取得檔案完整本機路徑，僅能讀取檔名，來源資料夾需手動輸入。
- rsync 在 Windows PowerShell 無原生支援，需搭配 WSL / Git Bash / cwRsync。
- 拖曳資料夾僅辨識頂層名稱，不展開內部檔案清單。
- 下載模式下遠端檔名需手動輸入（瀏覽器無法列出遠端主機的檔案）。
- PWA 離線快取僅在透過 http(s)（例如部署後的 GitHub Pages）存取時生效。
