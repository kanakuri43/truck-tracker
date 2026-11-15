# Truck Tracker 開発 TODO

## Phase 7: コース最適化（配達順おすすめ）※未着手・2026-11-15 方針変更

### 方針
- 配達先の住所 → 緯度経度（国土地理院 住所検索API）→ 直線距離で最短の配達順を提案
- すべて admin.html 内で完結（今の構成＝静的サイト + Supabase のまま、別ツール・サーバー不要）
- 国土地理院APIへは**住所のみ**送信（得意先名は送らない）→ 社内確認済み（2026-11-15）
- 不採用案: 実績の区間所要時間で最適化（2026-11-11案）→ 緯度経度方式に変更。実績補正は将来検討
- 不採用案: Google OR-Tools（Python/C++/Java/.NET のみでブラウザ不可、別サーバーが必要。1コース十数件なら JS で厳密解が出せる）
- 不採用案: アプリ内で Claude API 呼び出し（APIキー秘匿にサーバー関数が必要／認証なしで料金を不正に使われる恐れ／最短順の計算はLLMより普通のアルゴリズムが正確）

### 前提データ（2026-11-15 確認）
- `destinations` 36件中、`address` あり 33件（残り3件は座標なし扱い）
- `branches` に住所・座標なし → 列追加が必要
- 国土地理院API: `https://msearch.gsi.go.jp/address-search/AddressSearch?q=住所`
  - APIキー不要・CORS許可（`Access-Control-Allow-Origin: *`）→ admin.js から直接呼べる
  - 戻り値: `[{ geometry: { coordinates: [lng, lat] }, properties: { title: "照合した住所" } }]`
  - 正式公開・保証された API ではない → 毎回呼ばず、取得結果を DB に保存して使う
  - 精度は「番」「丁目」止まりのことあり → 照合住所を保存・表示し、手修正できるようにする

### 7-1 DB
- [x] `destinations` に `lat numeric` / `lng numeric` / `geocoded_title text`（照合した住所）追加
- [x] `branches` に `address text` / `lat numeric` / `lng numeric` 追加（出発・帰着地点）
- [x] マイグレーション SQL 作成 + `schema.sql` 反映 → `supabase/migrate_add_geocode_columns.sql`（要: Supabase ダッシュボードで実行）

### 7-2 admin.html マスタ管理
- [ ] 配達先: 「緯度経度取得」一括ボタン（座標が空の配達先のみ対象＝手修正を上書きしない）
- [ ] 配達先: 住所の登録・変更時はその配達先だけ再取得
- [ ] 配達先: 一覧に照合住所・座標の有無を表示、緯度経度を手修正可能に
- [ ] 支店: 住所入力欄 + 緯度経度取得・手修正

### 7-3 admin.html 配送計画
- [ ] 重量入力済みの配達先を対象に、支店 → 配達先 → 支店 の合計直線距離が最短になる順番を JS で計算
  - 厳密解（動的計画法、15件程度まで）、それを超える場合は最寄り順 + 2-opt 改善
- [ ] 座標のない配達先は「座標未登録 ○件」と表示し、現行の並び（`course_stops.stop_order`）のまま末尾に回す
- [ ] 表示: 「おすすめ順：合計 ○km（現行順より -△km）」＋ 採用ボタン
- [ ] 採用時は計画の stop_records の `stop_number` をおすすめ順で保存

### 7-4 index.html 計画モード
- [ ] 「次の届け先」自動セットを `stop_number` 順に（既存の重量登録済み優先ルールとの整合を確認）
- [ ] 順番変更・スキップなしの既存仕様は維持

### 運用（任意）
- [ ] 月1回、手元の `claude` CLI で結果をレビュー（得意先コード・数値のみ渡す。得意先名は送らない）


---

## 確認・決定待ち事項

| # | 項目 | 備考 |
|---|------|------|
| 6 | 帰社時刻の記録 | ✅ 実装済み（2026-11-15）: `reports.returned_at` に帰社ボタン押下時刻を記録・完了画面／Dashboard／日報編集（一覧・編集）に表示。要: Supabase ダッシュボードで `supabase/migrate_add_returned_at.sql` 実行 |
