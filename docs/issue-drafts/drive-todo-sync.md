# TODO の Drive 同期と Notion 手動同期を追加

## 概要

- フォルダごとの TODO を Google Drive 上の `TODO.md` と同期できるようにする
- 追加で、ローカル TODO を Notion の専用セクションへ手動で読込・保存できるようにする
- PWA 利用時の TODO 運用と、セッションをまたぐ引き継ぎを改善する

## 変更内容

- `MemoModal` で選択中フォルダの `TODO.md` を自動読込・再読込・保存できるように変更
- Google Drive 上の `TODO.md` を検索・読込・新規作成・更新する処理を追加
- ローカル TODO を Notion の専用セクションへ手動同期する処理を追加
- Notion 連携用の API エンドポイントを追加
- 開発環境でも Notion API を確認しやすいように Vite 側のミドルウェアを追加
- README に Notion 同期の設定方法と確認手順を追記

## 使い方

- 通常どおり曲フォルダを選んで `メモ` を開く
- Drive 側の `TODO.md` は自動で読まれる
- `Driveに保存` で Drive 上の `TODO.md` を更新する
- `Notionへ保存` で現在の TODO を Notion の `App TODO Sync: <フォルダ名>` に退避する
- `Notionから読込` で Notion 側のチェックリストをアプリへ戻す

## 補足

- Notion 側はページ全体ではなく、専用セクションのみを同期対象にしている
- Notion 連携は環境変数が設定されている場合のみ有効
- API キーやページ ID などの機密情報はリポジトリに含めていない

## テスト

- [x] `npm test`
- [x] 実 Notion ページに対する保存 / 読込 / 後片付け確認
- [ ] `npm run build`

## ビルド未確認の理由

- ローカル環境で既存の TypeScript 型定義不足により `npm run build` が失敗する状態
- 今回の変更とは別件で、`babel__core` などの型定義解決が必要
