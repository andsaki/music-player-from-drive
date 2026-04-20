# Driveフォルダごとの `TODO.md` を iPhone PWA から読み書きできるようにする

## 背景
現在の `メモ / TODO` 機能は `localStorage` 保存のため、iPhone の PWA (`music-player-from-drive.vercel.app`) から使っても、Mac の Ableton 制作環境や他デバイスと状態を共有できない。

制作運用としては、Ableton Project と 1 対 1 対応している Google Drive フォルダを正本にし、そのフォルダ内の `TODO.md` をこのアプリから直接読み書きしたい。

例:
- ローカル: `/Users/YudukiHotaru/Music/Ableton Projects/夜が落ちたら Project`
- Drive: `1LsJnrY3DQYFWYDxNjWfHyoD26gV-IFdm`

## 目的
- iPhone PWA から、選択中の Drive フォルダ内にある `TODO.md` を確認・更新できるようにする
- TODO の正本を Google Drive 側に移し、Mac / iPhone 間で同じ内容を扱えるようにする

## 要件
- 選択中フォルダごとに `TODO.md` を検索できる
- `TODO.md` が存在すれば読み込んでタスク一覧へ反映できる
- `TODO.md` が存在しなければ初回保存時に新規作成できる
- 編集後に同じ `TODO.md` を上書き保存できる
- Markdown チェックリスト形式 (`- [ ] ...`, `- [x] ...`) を扱える
- DTM 向けテンプレート追加機能は維持する
- iPhone PWA で成立する UX にする

## 完了条件
- `メモ` 画面を開くと、選択中フォルダの `TODO.md` を自動読込する
- `Driveに保存` で Drive 上の `TODO.md` が更新される
- `TODO.md` が無いフォルダでも初回保存で生成される
- iPhone PWA 前提の利用フローを README に記載する
