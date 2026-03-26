# Truck Tracker 開発 TODO

## 現状
- `docs/proposal/スマホ操作イメージ.html` — モックデモ（DB接続なし）あり → 画面設計・UXの参考として活用
- `docs/usage-for-smartphone.md` — ドライバー操作フロー確定済み
- Supabase / Netlify は未設定

---

## Phase 1: Supabase セットアップ
- [ ] Supabase プロジェクト作成（手動）
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
- [ ] Supabase ダッシュボードで schema.sql 実行
- [ ] Supabase ダッシュボードで seed.sql 実行
- [ ] Supabase URL / anon key をメモ → `config.js` に設定

---

## Phase 2: 環境設定 / 共通モジュール
- [x] `config.js` 作成（Supabase URL・Publishable key）
- [ ] `netlify.toml` 作成（リダイレクト等の基本設定）

---

## Phase 3: index.html（スマホ用 ドライバー画面）

### 3-1 画面構成（モックデモを実DB接続へ移行）
- [x] **選択画面** — 車輌・日付・コース選択
- [x] **出発前画面** — 行先選択 → 「出発」ボタン
- [x] **移動中画面** — 行先表示・経過時間タイマー → 「到着」ボタン
- [x] **到着後画面（中間）** — 重量入力・次の行先選択 → 「出発」ボタン
- [x] **帰社画面** — 帰社ODDメーター入力 → 「帰社」ボタン
- [x] **完了画面** — 配送サマリー表示

### 3-2 機能実装
- [x] Supabase からマスタデータ取得（trucks / courses / course_stops）
- [x] 日報 reports レコード作成・ステータス更新
- [x] stop_records 書き込み（出発・到着・重量）
- [x] **localStorage 対応** — ブラウザ再起動後の状態復元
- [x] 前回帰社ODDの取得（同車輌の直近 completed report から）
- [x] エラーハンドリング
- [x] **Undo 機能**（2026-03-26実装）
  - 移動中画面: 「出発を取り消す」→ stop_record を削除して出発前画面へ
  - 到着後画面: 「到着を取り消す」→ arrived_at / weight_kg をクリアして移動中画面へ
- Abort 機能 → **実装しないことに決定**
- [ ] 動作確認・実機テスト

---

## Phase 4: admin.html（管理者用 PC・タブレット）

### 4-1 レイアウト
- [x] Bootstrap 5 ベースのサイドバー + コンテンツ構成
- [x] サイドメニュー（車両位置 / 日報編集 / CSVダウンロード / マスタ管理）

### 4-2 Dashboard ✅
- [x] 車輌マスタ全台を起点に最新ステータス表示（1台1行）
- [x] サマリーカード（出庫前 / 稼働中 / 帰社済）— 出庫前は未出庫含む
- [x] 支店別 配達済み件数・総重量チップ
- [x] Supabase Realtime でリアルタイム更新
- [x] 手動更新ボタン

### 4-3 日報編集
- [ ] 日付・車輌・コースで絞り込み
- [ ] stop_records の編集（時刻・重量の手修正）
- [ ] ODDメーター値の修正
- [ ] 保存・取消機能

### 4-4 CSVダウンロード
- [ ] 日付範囲・支店・車輌でフィルタ
- [ ] ダウンロード列の仕様確定（日付/車輌/コース/配達先/出発時刻/到着時刻/重量/ODD等）
- [ ] CSV生成・ダウンロード処理

### 4-5 マスタ管理（CRUD）
- [ ] 支店マスタ（branches）
- [ ] 車輌マスタ（trucks）
- [ ] 配達先マスタ（destinations）
- [ ] 配送コースマスタ（courses）
- [ ] コース配達先順番管理（course_stops — ドラッグ&ドロップで並べ替えあると理想）

---

## Phase 5: テスト・デプロイ

- [ ] Netlify にプロジェクト接続
- [ ] Netlify 環境変数に Supabase URL / anon key 設定
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
| 2 | ODD入力 | 帰社時に入力 → 次回出庫時のデフォルト値として使用 |
| 3 | CSV列仕様 | 今後検討 |

## 確認・決定待ち事項

| # | 項目 | 備考 |
|---|------|------|
| 4 | コース×曜日 | 曜日で自動フィルタするか、手動選択か |
| 5 | 配達スキップ | スキップした配達先の扱い（記録なし or スキップ記録残す） |

---

## 進捗メモ
- 2026-03-25 todo.md 作成、仕様確認完了
