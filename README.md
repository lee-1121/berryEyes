# 🍓 BerryEyes ✧ 隱形眼鏡小幫手

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-ff85a2?style=for-the-badge&logo=github)](https://lee-1121.github.io/berryEyes/)
[![Interactive Showcase](https://img.shields.io/badge/Showcase-AutoPlay%20Demo-ffd1dc?style=for-the-badge&logo=safari&logoColor=d64161)](https://lee-1121.github.io/berryEyes/showcase.html)

**BerryEyes** 是一款專為美瞳（彩瞳）與隱形眼鏡愛好者設計的**輕量化配戴紀錄與情報追蹤 App**。本專案以現代簡約兼具 Y2K 少女感（馬卡龍粉、白色與玻璃擬態）的視覺風格呈現，旨在為使用者帶來極具生活儀式感的配戴紀錄體驗。

---

## 🌸 核心特色功能 (Core Features)

1. **雲端即時同步 (Supabase Cloud Sync)**
   - 使用者只需設定專屬暱稱或 ID 即可快速登入。
   - 後端整合 Supabase (PostgreSQL) 雲端資料庫，實現毫秒級跨裝置即時資料同步。
   - 若網路斷線，系統會自動無縫啟用本地緩存（Local Storage），確保記錄永不遺失。

2. **主畫面配戴壽命追蹤 (Active Wear Dashboard)**
   - 顯示當前啟用隱眼品牌、款式型號、剩餘壽命（例如日拋更換提醒、月拋建議期限倒數）。
   - 直覺的一鍵大愛心紀錄按鈕，按壓即可登入當日配戴，並會觸發 canvas-confetti 噴發淡粉與純白的雙色亮片特效。

3. **美瞳庫存與收藏管理 (Stock Drawer)**
   - 卡片式美瞳抽屜，支援不同品牌標籤高亮，並能以顏色一眼區分「配戴中」與「未啟用」的庫存款式。

4. **歷史配戴日曆日誌 (Wear History Calendar)**
   - 日曆中以粉色圈高亮標記已配戴日期。
   - 點選任何有標記的日期，下方會彈出當日詳細的配戴日誌資訊。

5. **最新美瞳情報爬蟲 (Live Chachalook Scraper)**
   - 動態 Live 爬蟲：透過多重 Proxy 備援鏈克服瀏覽器的跨域（CORS）限制，即時爬取官網最新折扣與款式情報。
   - 折疊手風琴卡片：過長內容自動漸層淡出，點擊動態展開或收合。

6. **智慧字串提取與快速加入 (NLP Autofill & Quick Add)**
   - 自動提取非結構化促銷情報中的「品牌（Brand）」與「款式型號（Model Name）」。
   - 使用者點選「快速加入」，系統會自動打開新增視窗並「自動填寫表單」，免除重複手動輸入的疲勞。

7. **成果影片展示頁面 (Interactive Showcase)**
   - 內建 `showcase.html` 自動演示模式（Auto-Play Demo）。點擊後網頁會像影片一樣自動模擬輸入、點擊、噴發亮片、展開手風琴與自動填表，方便進行螢幕錄影。

---

## 🛠️ 技術棧 (Tech Stack)

*   **前端核心**：Vanilla HTML5, CSS3, JavaScript (ES6+)，無重型框架，秒速載入。
*   **資料庫與後端**：Supabase JS Client v2 (基於 PostgreSQL)。
    *   **Supabase Realtime**：訂閱 `postgres_changes` 監聽。
*   **特效動畫**：`canvas-confetti` 特效粒子引擎。
*   **爬蟲代理備援鏈**：`corsproxy.io` ➔ `api.allorigins.win` ➔ `thingproxy`。

---

## ⚙️ Supabase 資料庫配置指南

若要使用您自己的 Supabase 雲端資料庫，請依循以下步驟進行設定：

### 1. 建立 lenses 資料表
在您的 Supabase 專案中的 **SQL Editor** 貼入並執行以下 SQL 語法：

```sql
create table public.lenses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id text not null,
  name text not null,
  brand text not null,
  color_hex text default '#FFB3C6'::text,
  photos text[] default '{}'::text[],
  activated_date text,
  wear_dates text[] default '{}'::text[],
  is_active boolean default false not null
);

-- 建立 user_id 索引，提升查詢效率
create index lenses_user_id_idx on public.lenses (user_id);
```

### 2. 開啟 Realtime (即時同步) 功能
由於 Supabase 安全機制，必須手動為資料表啟用 Realtime：
1. 進入 Supabase Dashboard ➔ 左側點選 **Database** ➔ 選擇 **Replication**。
2. 在 **`supabase_realtime`** 發布選項中，找到並點選 **Source**。
3. 將 **`lenses`** 資料表的開關切換為 **開啟 (Toggle On)**。

---

## 🚀 本地執行

本專案為純靜態網頁，您可以直接以瀏覽器雙擊開啟 `index.html` 進行操作；亦可使用任何本地伺服器（例如 VS Code 的 Live Server 插件、Python 的 `http.server` 或 npm 的 `http-server`）來運行它。
