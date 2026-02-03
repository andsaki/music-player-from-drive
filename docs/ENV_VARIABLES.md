# 環境変数ガイド

このドキュメントでは、プロジェクトで使用する環境変数について説明します。

## 📋 目次

- [環境変数一覧](#環境変数一覧)
- [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
- [本番環境（Vercel）のセットアップ](#本番環境vercelのセットアップ)
- [セキュリティベストプラクティス](#セキュリティベストプラクティス)

## 環境変数一覧

### フロントエンド（apps/web）

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `VITE_GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 クライアントID | `620477461173-xxx.apps.googleusercontent.com` |
| `VITE_API_BASE_URL` | ✅ | バックエンドAPIのベースURL | `http://localhost:3001` (開発)<br>`https://api.example.com` (本番) |
| `VITE_GOOGLE_DRIVE_FOLDER_ID` | ❌ | デフォルトのGoogle DriveフォルダID | `1hxrPx7JxNbqmLhJz-xd4FSkNgg44VOXq` |
| `VITE_GOOGLE_DRIVE_FOLDER_ID_2` | ❌ | 2番目のデフォルトフォルダID | `13xwtnfSUnizSVBCe8iDgiOxrU3n8BKaZ` |

### バックエンド（apps/server）

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 クライアントID | `620477461173-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth 2.0 クライアントシークレット | `GOCSPX-xxxxx` |
| `GOOGLE_REDIRECT_URI` | ✅ | OAuth認証後のリダイレクトURI | `http://localhost:3001/auth/google/callback` |
| `FRONTEND_URL` | ✅ | フロントエンドのURL（CORS設定用） | `http://localhost:5173` (開発)<br>`https://app.example.com` (本番) |
| `SERVER_PORT` | ❌ | サーバーポート（デフォルト: 3001） | `3001` |
| `NODE_ENV` | ❌ | 環境（デフォルト: development） | `development` / `production` |
| `SESSION_SECRET` | ✅ | セッション暗号化キー（32文字以上） | `ランダムな文字列` |

## ローカル開発環境のセットアップ

### 1. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアントID」
4. アプリケーションの種類: **ウェブアプリケーション**
5. 名前: `Music Player (Development)`
6. **承認済みの JavaScript 生成元**:
   ```
   http://localhost:5173
   ```
7. **承認済みのリダイレクト URI**:
   ```
   http://localhost:3001/auth/google/callback
   ```
8. クライアントIDとシークレットをコピー

### 2. 環境変数ファイルの作成

#### ルートディレクトリ

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```bash
# Frontend
VITE_GOOGLE_CLIENT_ID=620477461173-xxx.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:3001

# Backend
GOOGLE_CLIENT_ID=620477461173-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:5173
SERVER_PORT=3001
NODE_ENV=development
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

#### apps/server ディレクトリ

```bash
cp apps/server/.env.example apps/server/.env
```

または、ルートの `.env` をコピー：

```bash
cp .env apps/server/.env
```

### 3. 動作確認

```bash
# 開発サーバーを起動
pnpm dev

# フロントエンド: http://localhost:5173
# バックエンド: http://localhost:3001
```

## 本番環境（Vercel）のセットアップ

### 1. Google Cloud Console の設定（本番用）

1. 既存の OAuth クライアントIDに本番URLを追加、または新しいクライアントIDを作成
2. **承認済みの JavaScript 生成元**:
   ```
   https://your-frontend-url.vercel.app
   ```
3. **承認済みのリダイレクト URI**:
   ```
   https://your-backend-url.vercel.app/auth/google/callback
   ```

### 2. Vercel環境変数の設定

#### フロントエンド（apps/web）

1. Vercel ダッシュボード → プロジェクト選択
2. Settings → Environment Variables
3. 以下を追加：

```bash
VITE_GOOGLE_CLIENT_ID=620477461173-xxx.apps.googleusercontent.com
VITE_API_BASE_URL=https://your-backend-url.vercel.app
```

#### バックエンド（apps/server）

1. Vercel ダッシュボード → プロジェクト選択
2. Settings → Environment Variables
3. 以下を追加：

```bash
GOOGLE_CLIENT_ID=620477461173-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://your-backend-url.vercel.app/auth/google/callback
FRONTEND_URL=https://your-frontend-url.vercel.app
NODE_ENV=production
SESSION_SECRET=<32文字以上のランダム文字列>
```

**SESSION_SECRET の生成**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 環境の選択

各環境変数に対して、以下の環境を選択：
- ✅ Production
- ✅ Preview
- ✅ Development

## セキュリティベストプラクティス

### ✅ DO（推奨）

- ✅ `.env` ファイルを `.gitignore` に追加（既に設定済み）
- ✅ `SESSION_SECRET` は必ず32文字以上のランダム文字列を使用
- ✅ 本番環境では `GOOGLE_CLIENT_SECRET` を環境変数で管理
- ✅ HTTPSを使用（Vercelは自動）
- ✅ CORSを適切に設定（`FRONTEND_URL` で制限）
- ✅ 定期的にクライアントシークレットをローテーション

### ❌ DON'T（非推奨）

- ❌ `.env` ファイルをGitにコミットしない
- ❌ `GOOGLE_CLIENT_SECRET` をコードに直接記述しない
- ❌ 開発用の認証情報を本番で使用しない
- ❌ `SESSION_SECRET` に簡単な文字列を使用しない
- ❌ 本番環境で `NODE_ENV=development` を使用しない

## トラブルシューティング

### 環境変数が読み込まれない

**症状**: `undefined` になる

**解決策**:
1. ファイル名が正しいか確認（`.env` / `apps/server/.env`）
2. Viteの環境変数は `VITE_` プレフィックスが必要
3. サーバーを再起動
4. Vercelの場合、再デプロイが必要

### OAuth リダイレクトエラー

**症状**: `redirect_uri_mismatch`

**解決策**:
1. Google Cloud Console の「承認済みのリダイレクトURI」を確認
2. `GOOGLE_REDIRECT_URI` が一致しているか確認
3. URLの末尾にスラッシュがないか確認

### CORS エラー

**症状**: `Access-Control-Allow-Origin` エラー

**解決策**:
1. バックエンドの `FRONTEND_URL` が正しいか確認
2. `apps/server/src/index.ts` のCORS設定を確認
3. URLの末尾にスラッシュがないか確認

## 参考資料

- [Vite環境変数](https://vitejs.dev/guide/env-and-mode.html)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Vercel環境変数](https://vercel.com/docs/concepts/projects/environment-variables)
- [セキュリティベストプラクティス](https://owasp.org/www-project-top-ten/)
