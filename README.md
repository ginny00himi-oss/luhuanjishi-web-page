# 路環跡事

**Traces and Stories of Coloane**

公開網站：<https://ginny00himi-oss.github.io/luhuanjishi-web-page/>

GitHub 倉庫：<https://github.com/ginny00himi-oss/luhuanjishi-web-page>

《路環跡事》是一個網頁端 360° 互動敘事項目。觀眾由屠場前地出發，穿過船人街、榕樹、臨水棚屋與英利魚舖，最後抵達碼頭前地及路環碼頭，沿著空間留下的「跡」尋找曾在其中發生的「事」。

專案使用 React、Vite、TypeScript 與 Photo Sphere Viewer，沒有自建後端或地圖 API。魚舖掃描檔案以獨立頁面嵌入，只有觀眾在掃描頁主動啟動時才會請求攝影機權限。

## 本機運行

需要 Node.js 20.19 或以上版本。

```bash
npm install
npm run dev
```

Vite 啟動後會顯示本機網址，通常是 `http://localhost:5173`。建立生產版本：

```bash
npm run build
```

生產檔案輸出至 `dist/`。

## 團隊協作

第一次下載專案：

```bash
git clone https://github.com/ginny00himi-oss/luhuanjishi-web-page.git
cd luhuanjishi-web-page
npm install
npm run dev
```

後續更新可在專案目錄執行 `git pull`。請勿提交 `node_modules/` 或 `dist/`；它們會分別由 `npm install` 和 `npm run build` 產生。

推送至 `main` 後，`.github/workflows/deploy-pages.yml` 會自動安裝依賴、以 `/luhuanjishi-web-page/` 為基礎路徑建立生產版本，並發布到 GitHub Pages。

> 陀螺儀與攝影機屬於瀏覽器受保護功能，必須運行於 `localhost` 或 HTTPS；iOS 等裝置會在觀眾主動點擊相應按鈕後才詢問權限。

## 素材目錄

```text
public/
├─ panoramas/
│  ├─ 01.png
│  ├─ 02.png
│  ├─ ...
│  └─ 09.png
├─ audio/
│  └─ coloane-white-noise.mp3
└─ research/
   ├─ shipman-street-board.jpg
   └─ faith-temples-board.jpg
```

九張全景圖均為使用者提供的 4096×2048 PNG 原圖。網站不裁切、拼接、調色或改寫檔案，只將它們作為九個獨立的等距柱狀全景節點載入。

`coloane-white-noise.mp3` 是整個360體驗共用的循環環境聲。兩張 `research` 圖片是現場拍攝的資料展板，用於補充船人街、三聖宮與譚公廟的說明。

## 專案結構

```text
src/
├─ App.tsx                       # 360° 體驗、路線、檔案與控制
├─ components/HotspotEditor.tsx # ?edit=1 熱點編輯器
├─ data/scenes.ts               # 九場景與全部熱點資料
├─ data/hotspotDetails.ts       # 熱點歷史補充、來源與現場圖片
├─ lib/storage.ts               # 探索進度 localStorage
├─ styles.css                   # 沉浸式 ASCII 視覺與響應式介面
└─ types/webmcp.d.ts            # 可選的頁面代理工具型別
```

每個 `Scene` 包括：

- `id`、`title`、`subtitle`、`panorama`、`intro`
- `initialView`
- `hotspots`、`previousScene`、`nextScene`

每個 `Hotspot` 包括：

- `id`、`type`、`label`、`description`
- `yaw`、`pitch`
- `subtitle`、`icon`、`targetScene`
- 需要時使用可選的 `effect`、`externalUrl`、`notes`、`sources` 與 `fieldPhoto`

## 熱點編輯模式

在網址後加入 `?edit=1`：

```text
http://localhost:5173/?edit=1
```

進入體驗後可：

1. 點擊全景，在點擊位置新增熱點。
2. 拖動既有熱點更新 `yaw` 和 `pitch`。
3. 修改類型、標題、描述、字幕、圖標及目標場景。
4. 複製完整九場景 JSON，或匯出 UTF-8 `scenes.json`。

瀏覽器不會直接覆寫 `src/data/scenes.ts`。完成調整後，請以匯出結果更新專案資料。

## 聲音與掃描行為

- 頁面載入時不會播放；觀眾點擊「進入路環」後，同一段白噪音開始循環。
- 切換360場景不會更換或重啟音軌，右上角「白噪音」按鈕可隨時暫停及恢復。
- 網站不要求麥克風權限，也不錄音、不進行語音識別。
- 場景06的「進入棠記魚舖掃描」會在全屏覆蓋層開啟既有掃描頁；固定的「退出掃描」按鈕會返回原來的360場景。
- 攝影機只由掃描頁在觀眾主動啟動掃描時請求，主360頁不會自行開啟鏡頭。

## 無障礙與操作

- 滑鼠拖動、滾輪縮放、觸控滑動、雙指縮放
- 鍵盤方向鍵移動視線，Shift 可加快
- 陀螺儀只由按鈕啟動並在需要時要求權限
- 所有主要控制和熱點均有 ARIA 標籤與鍵盤操作
- 兼容 `prefers-reduced-motion`，並提供獨立的「減少動態效果」設定
- 探索記錄使用版本化 `localStorage`，可從說明面板清除

## 場景順序

1. 屠場前地・漁村入口
2. 屠場前地沿岸・樹影與海
3. 船人街街口・榕蔭分岔
4. 船人街轉角・街屋相連
5. 船人街・榕樹下的棚屋
6. 船人街・英利魚舖
7. 碼頭前地・船錨與門樓
8. 路環碼頭・離岸通道
9. 路環碼頭盡端・面向海風

場景切換使用約一秒的暗場及 ASCII 字符溶解；這些場景被明確視為相互連接的記憶節點，而不是物理上無縫拼接的單一全景。全程白噪音在切換期間保持連續。
