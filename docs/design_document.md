# Truck Tracker 設計ドキュメント

最終更新: 2026-03-29

---

## 1. 画面フロー（index.html）

```
[選択画面]
  車輌・日付・コース選択 → 「次へ」
        ↓
[出発前画面]
  行先選択（コースの配達先からプルダウン） → 「出発」
        ↓
[移動中画面]
  目的地・出発時刻・経過タイマー表示 → 「到着」
        ↓
[到着後画面]
  到着先・重量入力
  残り配達先あり → 次の行先選択 → 「出発」 または 「帰社へ」（任意帰社）
  残り配達先なし → 「帰社へ」
        ↓
[帰社画面]
  帰社ODOメーター入力 → 「帰社を記録」
        ↓
[完了画面]
  配送サマリー表示 → 「新しい日報を開始」
```

### 状態遷移（S.screen の値）
| 値 | 画面 |
|----|------|
| `init` | ローディング |
| `select` | 車輌・日付・コース選択 |
| `pre_depart` | 行先選択・出発前 |
| `in_transit` | 移動中 |
| `arrived` | 到着後・次の行先選択 |
| `return` | 帰社ODOメーター入力 |
| `completed` | 完了サマリー |

---

## 2. DBスキーマ概要

### テーブル一覧
| テーブル | 説明 |
|---------|------|
| `branches` | 支店マスタ |
| `trucks` | 車輌マスタ（branch_id で支店に紐付け） |
| `destinations` | 配達先マスタ（`sales_customer_code` で販売管理システムと紐付け） |
| `courses` | 配送コースマスタ（branch_id で支店に紐付け） |
| `course_stops` | コース×配達先の順番（stop_order で順序管理） |
| `reports` | 日報ヘッダ（1日1車輌1コース = 1レコード） |
| `stop_records` | 配達記録明細（1配達先 = 1レコード） |

### reports.status の値
| 値 | 意味 |
|----|------|
| `active` | 配送中（進行中） |
| `completed` | 帰社済み・完了 |
| `aborted` | 中断（Abort操作で設定） ※未実装 |

### stop_records の主要カラム
| カラム | 説明 |
|-------|------|
| `course_stop_id` | コース配達先マスタへの参照 |
| `destination_name` | 配達先名スナップショット（マスタ変更対策） |
| `stop_number` | 実際の配達順番（コース順と異なる場合あり） |
| `departed_at` | 出発タイムスタンプ |
| `arrived_at` | 到着タイムスタンプ（NULLなら移動中） |
| `weight_kg` | 配達重量 |

### ビュー
- `active_reports_today`: 本日のアクティブ日報一覧（ダッシュボード用）
  - 各車輌の現在地・ステータス・最終アクション時刻を返す

---

## 3. 業務ルール

### ODO（ODOメーター）
- 出庫時のODOは**前回帰社時のODO**を `depart_odo` にセット
- 取得方法: 同車輌の最新 `completed` レポートの `arrive_odo`
- 帰社時に `arrive_odo` を入力 → 次回の `depart_odo` になる

### 配達順序
- コースに設定された順番（`stop_order`）が基本
- 順番変更・スキップは任意（ドロップダウンで毎回選択）
- 完了済みの配達先は選択肢から除外（`completedStopIds` で管理）

### 途中帰社
- コースの全配達先を回り終えなくても帰社可能
- 到着後画面で「帰社へ」ボタン（常に表示）から帰社フローへ遷移

### localStorage
- キー: `tt_report_id`
- 保持する値: 進行中の `reports.id`
- ブラウザ再起動時: DBから状態を復元し適切な画面を表示
- 帰社完了時: localStorage から削除

---

## 4. Undo / Abort 仕様（未実装）

### Undo
- **定義**: ひとつ前の打刻（タップ）を取り消して1つ前の状態に戻る
- 例: 「出発」を押した直後 → stop_record を削除して出発前画面に戻る
- 例: 「到着」を押した直後 → stop_record の arrived_at を NULL に戻して移動中画面に戻る

### Abort
- **定義**: 途中まで配送していてもすべての操作を取り消す（出発してないことにする）
- 操作: `reports.status` を `'aborted'` に更新 → 選択画面へ遷移
- localStorage をクリア
- 実装時に `schema.sql` の `reports.status` CHECK 制約に `'aborted'` を追加する必要あり

---

## 5. 未決定事項

| # | 項目 | 備考 |
|---|------|------|
| 1 | コース×曜日 | 曜日で自動フィルタするか、手動選択か |
| 2 | 配達スキップ | スキップした配達先の扱い（記録なし or スキップ記録残す） |
| 3 | CSV列仕様 | 3形式実装済み（得意先別・車輌別・ジャーナル）。追加列は今後検討 |

---

## 6. admin.html

### 実装済み
- **車両位置確認（リアルタイム）**: Supabase Realtime で自動更新
  - `stop_records` / `reports` テーブルの変更を WebSocket で受信 → `loadDashboard()` 呼び出し
  - **注意**: Supabase 側で `ALTER PUBLICATION supabase_realtime ADD TABLE stop_records; ALTER PUBLICATION supabase_realtime ADD TABLE reports;` を実行しないと動作しない
- **レポート**: 直近1か月の集計グラフ（Chart.js）
  - 総重量（kg）/ 配送回数 / 走行距離（km）を日別棒グラフ・折れ線グラフで表示
  - 支店フィルター（すべて／支店指定）
- **CSVダウンロード**: 日付範囲・支店・車輌でフィルタ・3形式対応
  - フォーマット選択順: 得意先別集計 / 車輌別集計 / ジャーナル形式
  - 得意先別集計に販売管理得意先コード（`sales_customer_code`）列を追加
- **マスタ管理（CRUD）**: 支店・車輌・配達先・コース・コース配達順
  - 配達先マスタに `sales_customer_code`（販売管理システムとの紐付けコード）を追加

### 未実装
- **日報編集**: stop_records・ODO の手修正
