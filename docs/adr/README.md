# Architecture Decision Records (ADR)

このディレクトリには、プロジェクトの重要なアーキテクチャ決定を記録した ADR (Architecture Decision Record) を保管しています。

## ADR とは

ADR は、プロジェクトにおける重要な技術的意思決定を文書化したものです。以下の目的で使用します：

- **意思決定の透明性**: なぜその技術を選んだのか、理由を明確にする
- **知識の共有**: 新しいメンバーが過去の決定背景を理解できる
- **将来の参考資料**: 同じ問題に直面した時の判断材料になる
- **議論の記録**: 検討した代替案とその評価を残す

## ADR 一覧

| 番号 | タイトル | ステータス | 日付 |
|------|---------|-----------|------|
| [0001](./0001-use-framer-motion-for-animations.md) | Framer Motion をアニメーションライブラリとして使用する | Accepted | 2026-01-30 |
| [0002](./0002-bundle-size-optimization.md) | バンドルサイズの最適化（コード分割と遅延ロード） | Accepted | 2026-01-30 |

## ADR のフォーマット

各 ADR は以下の構造で記述します：

```markdown
# ADR-XXXX: [タイトル]

## ステータス
[Proposed / Accepted / Deprecated / Superseded]

## コンテキスト
[背景と課題の説明]

## 決定内容
[何を決めたか]

## 理由と根拠
[なぜそう決めたか、データや分析]

## 結果と影響
[決定による影響、メリット・デメリット]

## 検討した代替案
[他に検討した選択肢とその評価]

## 関連リソース
[参考リンクやドキュメント]

## 次のアクション
[この決定に基づいて実施すべきこと]
```

## ステータスの定義

- **Proposed**: 提案中（議論・レビュー待ち）
- **Accepted**: 承認済み（実装・運用中）
- **Deprecated**: 非推奨（新しい ADR に置き換えられた）
- **Superseded**: 廃止（別の ADR で上書きされた）

## ADR の作成方法

1. **番号を決める**: 既存の ADR の次の番号を使用（例: 0002）
2. **ファイル名**: `XXXX-kebab-case-title.md` の形式
3. **テンプレートを使用**: 上記のフォーマットに従う
4. **レビュー**: チームメンバーに共有してフィードバックを得る
5. **マージ**: 承認後、ステータスを "Accepted" に変更

## 参考リンク

- [ADR GitHub リポジトリ](https://github.com/joelparkerhenderson/architecture-decision-record)
- [ADRs のベストプラクティス](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
