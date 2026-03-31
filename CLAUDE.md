# 配送記録アプリ 『Truck Tracker』

## 概要
- 自社の配送部門の配達記録を管理するwebアプリ
- 各ドライバーがスマホから「出発」や「配達先に到着」などのアクションの前に打刻
- PC/タブレット/スマホ レスポンシブデザイン
- 登録データは最終的に販売管理のデータと結合して、利益の測定に使用する
- リアルタイムで車両がどこに配達中か把握（PC想定）
- 日付範囲指定してCSVダウンロード（PC想定）
- 日報データ編集（PC想定）

## 環境
- Supabase（DB・RLS）
- Netlify（ホスティング）
- HTML / CSS / Vanilla JS
- Bootstrap 5.3

## ファイル構成
```
netlify.toml                Netlify デプロイ設定（publish = public/）
.netlifyignore              Netlify デプロイ除外設定
public/
  index.html                ドライバー用スマホ画面
  admin.html                管理者用ダッシュボード
  config.js                 Supabase URL / anon key
  css/
    index.css               スマホ画面スタイル
    admin.css               管理者画面スタイル
  js/
    index.js                スマホ画面ロジック
    admin.js                管理者画面ロジック
supabase/
  schema.sql                DBスキーマ・RLS・インデックス・ビュー
  seed.sql                  テスト用シードデータ
  migrate_add_sales_customer_code.sql
  migrate_course_stop_set_null.sql
  migrate_rename_odd_to_odo.sql
docs/
  design_document.md        設計ドキュメント
  reference/                参考資料（操作イメージ・PDF等）
  全体構成.pptx
  user's-manual.pptx
  admin's-manual.pptx
tasks/todo.md               開発TODO・進捗管理
```

## 実装状況（2026-03-31時点）

### 完成済み
- **public/index.html（スマホ用ドライバー画面）** — 全画面実装済み・DB接続済み
  - 選択 → 出発前 → 移動中 → 到着後 → 帰社 → 完了 の画面フロー
  - localStorage によるブラウザ再起動後の状態復元
  - 途中帰社対応（コースの全配達先を回らなくても帰社ボタンが押せる）
  - 前回帰社ODOの自動引き継ぎ
- **supabase/schema.sql** — スキーマ・RLS・インデックス・ビュー・Realtime設定
- **supabase/seed.sql** — テスト用シードデータ
- **public/admin.html（管理者画面）** — Dashboard・レポート・CSVダウンロード・マスタ管理 実装済み
  - Supabase Realtime による自動更新（`stop_records` / `reports` テーブル）
  - ※ Realtime には `ALTER PUBLICATION supabase_realtime ADD TABLE ...` が必要（schema.sql に記載済み）
  - サイドメニュー: Dashboard / 日報編集 / レポート / CSVダウンロード / マスタ管理
  - レポート: 直近1か月の総重量・配送回数・走行距離グラフ（支店フィルター付き、Chart.js）
  - CSVダウンロード: 得意先別集計に販売管理得意先コード列追加

### 未着手
- Supabase プロジェクト作成・SQL実行（手動作業）
- Netlify 環境変数設定（現在は config.js で代替）
- 日報編集機能（admin.html）
- 実機テスト

## 確定仕様
- **認証なし**（anon keyのみ）
- **ODO入力**: 帰社時に入力 → 次回出庫時のデフォルト値
- **途中帰社**: 全配達先を回らなくても任意のタイミングで帰社可能
- **Undo**: ひとつ前の打刻（タップ）を取り消して1つ前の状態に戻る
- **Abort**: 途中まで配送していてもすべての操作を取り消す（出発してないことにする） → `reports.status = 'aborted'` にして選択画面へ
- **配達順序**: コース順が基本だが、順番変更・スキップあり（ドロップダウンで都度選択）

## 未決定事項
- コース×曜日: 曜日で自動フィルタするか手動選択か
- 配達スキップ: スキップした配達先の記録をどうするか（記録なし or スキップ記録残す）
- CSV列仕様

## その他・注意事項
- 出発〜到着まで1時間以上かかるケースあり → localStorage 必須
- PCからリアルタイムモニタリングするため、アクションごとにDBを更新する
- ブラウザ終了→再表示時はDBのステータスを元に画面を復元する
- 詳細設計は `docs/design_document.md` を参照
