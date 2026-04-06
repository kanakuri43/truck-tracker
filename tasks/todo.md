# Truck Tracker 開発 TODO

## 現状
- `docs/proposal/スマホ操作イメージ.html` — モックデモ（DB接続なし）あり → 画面設計・UXの参考として活用
- `docs/usage-for-smartphone.md` — ドライバー操作フロー確定済み
- Supabase / Netlify は未設定

---

## Phase 1: Supabase セットアップ
- [x] Supabase プロジェクト作成（手動）
- [x] DBスキーマ設計・SQL作成 → `supabase/schema.sql`
  - `branches`（支店）
  - `trucks`（車輌）
  - `destinations`（配達先）
  - `courses`（配送コース）
  - `course_stops`（コース×配達先 順番）
  - `reports`（日報ヘッダ）
  - `stop_records`（配達記録明細）
  - ビュー `active_reports_today`（ダッシュボード用）
- [x] RLS設定済み（anon に全操作許可） → `supabase/schema.sql`
- [x] テスト用シードデータ作成 → `supabase/seed.sql`
- [x] Supabase ダッシュボードで schema.sql 実行
- [x] Supabase ダッシュボードで seed.sql 実行
- [x] Supabase URL / anon key をメモ → `config.js` に設定
- [x] Realtime 有効化（SQL Editor で `ALTER PUBLICATION supabase_realtime ADD TABLE stop_records, reports;`）

---

## Phase 2: 環境設定 / 共通モジュール
- [x] `config.js` 作成（Supabase URL・Publishable key）
- [x] `netlify.toml` 作成（publish="."・セキュリティヘッダー）
- [x] `.netlifyignore` 作成（docs/supabase/tasks/CLAUDE.md 除外 ※drag&dropでは無効）

---

## Phase 3: index.html（スマホ用 ドライバー画面）

### 3-1 画面構成（モックデモを実DB接続へ移行）
- [x] **選択画面** — 支店選択 → 車輌・日付・コース選択（支店で連動絞り込み）
- [x] **出発前画面** — 行先選択 → 「出発」ボタン
- [x] **移動中画面** — 行先表示・経過時間タイマー → 「到着」ボタン
- [x] **到着後画面（中間）** — 重量入力・次の行先選択 → 「出発」ボタン
- [x] **帰社画面** — 帰社ODOメーター入力 → 「帰社」ボタン
- [x] **完了画面** — 配送サマリー表示

### 3-2 機能実装
- [x] Supabase からマスタデータ取得（trucks / courses / course_stops）
- [x] 日報 reports レコード作成・ステータス更新
- [x] stop_records 書き込み（出発・到着・重量）
- [x] **localStorage 対応** — ブラウザ再起動後の状態復元
- [x] 前回帰社ODOの取得（同車輌の直近 completed report から）
- [x] エラーハンドリング
- [x] **Undo 機能**（2026-03-26実装）
  - 移動中画面: 「出発を取り消す」→ stop_record を削除して出発前画面へ
  - 到着後画面: 「到着を取り消す」→ arrived_at / weight_kg をクリアして移動中画面へ
  - 出発前画面: 「車輌・コース選択に戻る」→ report を削除して選択画面へ
- [x] 日報開始時、配送中（出発済み）の車輌を選択不可に
- [x] 帰社後「新しい日報を開始」で車輌リストをリフレッシュ
- [x] 支店選択 → 車輌・コースを連動絞り込み
- [ ] 動作確認・実機テスト

---

## Phase 4: admin.html（管理者用 PC・タブレット）

### 4-1 レイアウト
- [x] Bootstrap 5 ベースのサイドバー + コンテンツ構成
- [x] サイドメニュー（Dashboard / 日報編集 / レポート / CSVダウンロード / マスタ管理）

### 4-2 Dashboard ✅
- [x] 車輌マスタ全台を起点に最新ステータス表示（1台1行）
- [x] サマリーカード（出庫前 / 稼働中 / 帰社済）— 出庫前は未出庫含む
- [x] 支店別 配達済み件数・総重量チップ
- [x] Supabase Realtime でリアルタイム更新（要: Supabase ダッシュボードで publication にテーブル追加）
- [x] 手動更新ボタン

### 4-3 日報編集
- [ ] 日付・車輌・コースで絞り込み
- [ ] stop_records の編集（時刻・重量の手修正）
- [ ] ODOメーター値の修正
- [ ] 保存・取消機能

### 4-4 レポート ✅
- [x] 直近1か月の日別グラフ（Chart.js）
  - 総重量（kg）/ 配送回数 / 走行距離（km）
- [x] 支店フィルター（すべて／支店指定）

### 4-5 CSVダウンロード ✅
- [x] 日付範囲・支店・車輌でフィルタ
- [x] CSV生成・ダウンロード処理（BOM付きUTF-8・Excelで文字化けなし）
- [x] プレビュー機能（最大100行表示）
- [x] 3種類のフォーマット選択（左から: 得意先別集計 / 車輌別集計 / ジャーナル形式）
  - 得意先別集計（得意先名・販売管理得意先コード・配達件数・総重量）
  - 車輌別集計（1行=1日報、配達件数・総重量）
  - ジャーナル形式（1行=1 stop_record）

### 4-6 マスタ管理（CRUD）✅
- [x] 支店マスタ（branches）
- [x] 車輌マスタ（trucks）
- [x] 配達先マスタ（destinations）— `sales_customer_code`（販売管理得意先コード）追加
- [x] 配送コースマスタ（courses）— `day_of_week smallint[]` 追加（空配列=実施なし、全選択=毎日、部分選択=特定曜日）
- [x] コース配達先順番管理（course_stops）

---

## Phase 5: 事前計画機能（仕様変更・2026-04-01決定）

### 概要
- 管理者が日付・コース・配達先・重量を事前登録（計画）
- ドライバーは計画から選択して出発、重量入力不要
- 計画外の配達は発生しない前提
- 既存テーブルを活用（計画専用テーブルは作らない）

### 5-1 DBマイグレーション
- [x] `reports.truck_id` → NULL 許容に変更（計画作成時はトラック未定）
- [x] `reports.status` に `'planned'` / `'aborted'` を追加（CHECK 制約変更）
- [x] `stop_records` に `status text` 追加（NULL=フリーモード, 'planned'/'completed'/'skipped'=計画モード）
- [x] マイグレーション SQL 作成 → `supabase/migrate_add_plan_status.sql`

### 5-2 admin.html — 計画作成UI
- [x] サイドメニューに「配送計画」追加
- [x] 日付・コース選択 → そのコースの `course_stops` 一覧を表示
- [x] 各配達先に「含める/外す」チェックボックス + 重量入力欄
- [x] 順番変更（矢印ボタン）
- [x] 「計画保存」→ `reports`（planned, truck_id=NULL）+ `stop_records`（planned）を一括 INSERT
- [x] 既存計画の確認・削除（status='planned' のみ削除可）

### 5-3 index.html — フロー変更（計画モード + フリーモード両対応）
- [x] **選択画面**: タブ切り替え「計画から選択」/「フリー入力」
  - 計画タブ: 今日の planned レポート一覧 → 選択 → 車輌選択 → 「次へ」
  - フリータブ: 従来の車輌・日付・コース選択
  - 出発時に `reports.truck_id` をセット、`status='active'` に更新
- [x] **出発前画面**: 計画 stop_records から選択（フリーは course_stops から選択）
- [x] **到着後画面**（計画モード）: 重量入力なし、スキップボタン追加
  - 「出発」→ 次の stop_record の departed_at をセット
  - 「スキップ」→ `stop_record.status='skipped'`（選択肢から除外）
  - 「到着」→ `stop_record.status='completed'`, `arrived_at` セット
- [x] **Undo**（計画モード）: 取り消し時に report を `planned` / `truck_id=NULL` に戻す
- [x] **状態復元**: stop_records の status 有無でモード判定、画面復元

---

## Phase 6: テスト・デプロイ

- [x] Netlify にドラッグ&ドロップでデプロイ（動作確認済み）
- [ ] Netlify 環境変数に Supabase URL / anon key 設定（config.js で代替中）
- [ ] スマホ実機テスト（iOS Safari / Android Chrome）
- [ ] PC ブラウザテスト（admin）
- [ ] ブラウザ閉じ→復元シナリオテスト
- [ ] 並行日報テスト（複数ドライバーが同時打刻）
- [ ] 本番データ投入

---

## 確認・決定済み事項

| # | 項目 | 決定内容 |
|---|------|---------|
| 1 | 認証方式 | 認証なし（anon keyのみ） |
| 2 | ODO入力 | 帰社時に入力 → 次回出庫時のデフォルト値として使用 |
| 3 | CSV列仕様 | 3形式確定・実装済み |

## 確認・決定待ち事項

| # | 項目 | 備考 |
|---|------|------|
| 4 | コース×曜日 | ✅ 決定・実装済み（下記参照） |
| 5 | 配達スキップ | ✅ 決定（2026-04-01）: `stop_records.status='skipped'` でスキップ記録を残す |
| 6 | 帰社時刻の記録 | 現状 `reports` に帰社 timestamp なし。`arrive_odo` と `status='completed'` のみ。必要なら `returned_at timestamptz` 列追加 + 帰社ボタン押下時に記録する対応が必要 |

---

## 進捗メモ
- 2026-03-25 todo.md 作成、仕様確認完了
- 2026-03-26 Phase 3 完成、admin.html Dashboard・CSVダウンロード完成、Netlifyデプロイ確認
- 2026-03-27 Realtime 自動更新が動作しない問題を解決（supabase_realtime publication にテーブルを追加する必要があった）
- 2026-03-29 レポート画面追加（Chart.js・直近1か月・支店フィルター）、ODO表記統一（ODD→ODO、DBカラム名も変更）、destinations に sales_customer_code 追加、CSV得意先別集計に販売管理得意先コード列追加
- 2026-04-06 Phase 5 実装完了
  - migrate_add_plan_status.sql 作成（Supabase ダッシュボードで実行が必要）
  - admin.html/admin.js: 配送計画セクション追加（作成・一覧・削除）
  - index.js: 計画モード＋フリーモード両対応（タブ切り替え、スキップ機能、状態復元）
  - フリーモードは既存動作を完全維持
- 2026-04-01 事前計画機能の仕様決定（Phase 5 追加）
  - 管理者が日付・コース・配達先・重量を事前登録
  - ドライバーは計画一覧から選択 → トラック選択 → 出発（重量入力不要）
  - DB: reports.truck_id NULL許容化、status に 'planned' 追加、stop_records に status 追加
  - 順番変更・スキップ（status='skipped'）は引き続きドライバー側で可能
  - 計画外の突発配達なし、出発後の計画変更なし
- 2026-03-31 courses に day_of_week 追加（曜日別コース対応）
  - DB: `courses.day_of_week smallint[]`（要マイグレーション: `supabase/migrate_add_day_of_week.sql`）
  - 仕様: 空配列=実施なし、[1..7]全選択=毎日、部分選択=特定曜日のみ、NULL=毎日（後方互換）
  - index.html: 選択した日付の曜日でコース一覧を自動フィルター、日付変更時も連動
  - index.html: コース名の後ろに曜日を表示（例: 市内1（月・水・金））
  - admin.html: コースマスタに運行曜日列追加・追加/編集モーダルに曜日チェックボックス追加
