# 実装計画: Issue #71 ボトム余白調整

## Issue
- #71: ボトムの余白治ってない
- 添付画像から、初回/立ち上げ時の下部余白が不足している可能性を調査する。

## 方針
- 下部固定プレイヤーとドラッグ用 `gapOverlay` の状態管理を確認する。
- iOS PWA で `touchcancel` や pointer cancel が発生しても、ドラッグ位置と下部 overlay が残らないようにする。
- 実装後に lint/build/test と Chrome スクリーンショット確認を実施する。
