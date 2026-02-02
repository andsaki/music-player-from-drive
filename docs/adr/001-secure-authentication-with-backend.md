# ADR 001: セキュアな認証システムの実装（HttpOnly Cookie + バックエンドサーバー）

## ステータス
**承認済み** - 2026-02-02

## コンテキスト

### 現在の問題
現在のアプリケーションは、Google OAuth 2.0のアクセストークンを**sessionStorage**に保存しています。これにはいくつかの問題があります：

1. **セッション持続性の問題**
   - ブラウザを閉じるとログアウトされる
   - ユーザー体験が悪い

2. **トークン有効期限の問題**
   - Googleのアクセストークンは**1時間**で期限切れ
   - 頻繁な再ログインが必要

3. **セキュリティの懸念**
   - sessionStorage/localStorageは**XSS攻撃**に対して脆弱
   - JavaScriptから簡単にアクセスできる
   - トークンが盗まれるリスク

### 現在のアーキテクチャ
```
┌─────────────┐                  ┌─────────────┐
│  Frontend   │  ──────────────> │ Google API  │
│   (React)   │  <────────────── │   OAuth2    │
└─────────────┘                  └─────────────┘
      ↓
sessionStorage
(トークンがJSから丸見え)
```

### 検討した選択肢

#### 選択肢1: localStorage に変更
- **メリット**: ブラウザを閉じてもセッション維持
- **デメリット**: トークンは1時間で期限切れ、XSS脆弱性は変わらず
- **評価**: セキュリティ面で不十分

#### 選択肢2: トークン監視 + 自動再認証
- **メリット**: 期限切れ前に自動再認証
- **デメリット**: ユーザー不在時は再認証不可、実装が複雑
- **評価**: リフレッシュトークンなしでは限界がある

#### 選択肢3: **HttpOnly Cookie + バックエンドサーバー**（採用）
- **メリット**:
  - トークンがJavaScriptから完全に隠蔽される
  - リフレッシュトークンで長期間のセッション維持
  - XSS攻撃からトークンを保護
  - 業界標準のセキュリティベストプラクティス
- **デメリット**:
  - バックエンドサーバーが必要
  - 実装コストが高い
  - インフラ管理が必要
- **評価**: セキュリティと利便性のベストバランス

## 決定

### 採用する技術スタック

**バックエンド**: Node.js + Express + TypeScript
- **理由**:
  - React（フロントエンド）とのコード共有が可能
  - JavaScriptで統一できる
  - エコシステムが豊富
  - Vercelでフロントエンドと一緒にデプロイ可能

**認証方式**: OAuth 2.0 サーバーサイドフロー + リフレッシュトークン
- Authorization Codeフローを使用
- アクセストークンとリフレッシュトークンをサーバー側で管理
- HttpOnly Cookieでセッション管理

**プロジェクト構造**: server/フォルダを追加
```
music-player-from-drive/
├── src/                # フロントエンド（React + Vite）
├── server/             # バックエンド（Express + TypeScript）
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/     # APIルート
│   │   ├── middleware/ # 認証ミドルウェア
│   │   ├── utils/      # ヘルパー関数
│   │   └── types/      # TypeScript型定義
│   ├── package.json
│   └── tsconfig.json
├── package.json        # ルートのpackage.json
└── docs/adr/           # アーキテクチャ決定記録
```

### 新しいアーキテクチャ

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Frontend   │ ───> │   Backend    │ ───> │ Google API  │
│   (React)   │ <─── │   (Express)  │ <─── │   OAuth2    │
└─────────────┘      └──────────────┘      └─────────────┘
     ↓                      ↓
HttpOnly Cookie      アクセストークン
(JSからアクセス不可)   + リフレッシュトークン
                      (サーバーで安全に保管)
```

### 実装する機能

1. **OAuth 2.0 サーバーサイドフロー**
   - `/auth/google` - Google認証開始エンドポイント
   - `/auth/google/callback` - Google認証コールバック
   - Authorization Codeをアクセストークンとリフレッシュトークンに交換

2. **リフレッシュトークン管理**
   - リフレッシュトークンをメモリまたはデータベースに保存
   - アクセストークン期限切れ時に自動更新
   - セッション有効期限: 7日間（設定可能）

3. **HttpOnly Cookie設定**
   - `httpOnly: true` - JavaScriptからアクセス不可
   - `secure: true` - HTTPS通信のみ（本番環境）
   - `sameSite: 'lax'` - CSRF対策
   - Cookie名: `session_id`

4. **CORS設定**
   - 開発環境: `http://localhost:5173` (Viteデフォルトポート)
   - 本番環境: デプロイ先のドメイン
   - `credentials: true` - Cookie送信を許可

5. **セキュリティヘッダー**
   - Helmet.jsを使用
   - CSP（Content Security Policy）
   - XSS対策

## 結果

### 良い点

✅ **セキュリティの大幅な向上**
- トークンがJavaScriptから完全に隠蔽
- XSS攻撃からトークンを保護
- 業界標準のセキュリティベストプラクティスに準拠

✅ **ユーザー体験の改善**
- ブラウザを閉じてもセッション維持（7日間）
- 自動トークンリフレッシュで中断なし
- 頻繁な再ログインが不要

✅ **スケーラビリティ**
- データベース追加でマルチサーバー対応可能
- セッション管理の柔軟性
- 将来的な機能拡張がしやすい

✅ **保守性**
- TypeScriptで型安全
- フロントエンドとコードベースを統一
- テストが書きやすい

### 悪い点（トレードオフ）

❌ **実装コストの増加**
- バックエンドサーバーの構築が必要
- OAuth 2.0フローの実装が複雑
- テストケースの増加

❌ **インフラ管理の複雑化**
- サーバーのデプロイとメンテナンスが必要
- 環境変数の管理が増える
- モニタリングとログ管理が必要

❌ **開発速度への影響**
- フロントエンドとバックエンドの両方を開発
- APIのバージョン管理が必要
- CORS設定のデバッグが必要になる場合がある

## 実装計画

### Phase 1: バックエンドの基本構造（完了）
- [x] server/フォルダとディレクトリ構造の作成
- [x] package.jsonとtsconfig.jsonの設定
- [x] ADRの作成

### Phase 2: Expressサーバーのセットアップ（次のステップ）
- [ ] index.tsの実装
- [ ] 基本的なミドルウェアの設定（CORS, Helmet, Cookie Parser）
- [ ] エラーハンドリング

### Phase 3: OAuth 2.0の実装
- [ ] Google OAuth 2.0クライアントの設定
- [ ] 認証エンドポイントの実装
- [ ] コールバックハンドラーの実装
- [ ] トークン取得と保存

### Phase 4: リフレッシュトークン管理
- [ ] トークンストレージの実装（メモリまたはDB）
- [ ] トークンリフレッシュロジック
- [ ] セッション有効期限の管理

### Phase 5: フロントエンドの修正
- [ ] sessionStorage削除
- [ ] バックエンドAPIとの連携
- [ ] エラーハンドリングの改善

### Phase 6: テストとデプロイ
- [ ] 開発環境でのテスト
- [ ] Google Cloud Consoleの設定変更
- [ ] 本番環境へのデプロイ
- [ ] セキュリティ監査

## 追加のセキュリティ対策

### 短期（実装時）
- CSRF トークンの実装
- Rate Limitingの追加
- ログイン試行回数の制限

### 中期（デプロイ後）
- セッション監視とログ記録
- 不審なアクセスパターンの検出
- トークン失効メカニズム

### 長期（将来）
- 2要素認証（2FA）の追加
- セキュリティ監査の定期実施
- ペネトレーションテスト

## 参考資料

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [HttpOnly Cookie Best Practices](https://owasp.org/www-community/HttpOnly)

## 変更履歴

- 2026-02-02: 初版作成、HttpOnly Cookie + バックエンドサーバーの採用を決定
