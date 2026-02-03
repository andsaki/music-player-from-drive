# Vercel デプロイガイド

このプロジェクトは **pnpm workspaces + Turborepo** のモノレポ構成です。Vercelへのデプロイには、フロントエンドとバックエンドを**別々のプロジェクト**として設定する必要があります。

## 📋 前提条件

- Vercel アカウント
- GitHub/GitLab/Bitbucket にリポジトリをプッシュ済み
- Google Cloud Console で OAuth 2.0 認証情報を作成済み

## 🚀 デプロイ手順

### 1. フロントエンド（apps/web）のデプロイ

#### 1-1. Vercel プロジェクトの作成

1. [Vercel ダッシュボード](https://vercel.com/dashboard) にアクセス
2. "Add New..." → "Project" をクリック
3. リポジトリを選択
4. **Project Name**: `music-player-web` (任意)
5. **Framework Preset**: Vite
6. **Root Directory**: `apps/web` を選択
7. **Build Command**: デフォルトのまま（vercel.jsonで上書き）
8. **Output Directory**: `dist`

#### 1-2. 環境変数の設定

以下の環境変数を設定：

| 変数名 | 値の例 | 説明 |
|--------|--------|------|
| `VITE_GOOGLE_CLIENT_ID` | `620477461173-xxx.apps.googleusercontent.com` | Google OAuth 2.0 クライアントID |
| `VITE_API_BASE_URL` | `https://music-player-server.vercel.app` | バックエンドAPIのURL（後で設定） |
| `VITE_GOOGLE_DRIVE_FOLDER_ID` | `1hxrPx7JxNbqmLhJz-xd4FSkNgg44VOXq` | デフォルトのGoogle DriveフォルダID（オプション） |

**設定方法**:
1. Project Settings → Environment Variables
2. 各変数を追加（Name, Value）
3. Environment: Production, Preview, Development すべてにチェック
4. "Save" をクリック

#### 1-3. ビルド設定の確認

**Build & Development Settings**:
- **Framework Preset**: Vite
- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && pnpm build --filter=@music-player/web`
- **Output Directory**: `dist`
- **Install Command**: `cd ../.. && pnpm install`

### 2. バックエンド（apps/server）のデプロイ

#### 2-1. Vercel プロジェクトの作成

1. [Vercel ダッシュボード](https://vercel.com/dashboard) にアクセス
2. "Add New..." → "Project" をクリック
3. **同じリポジトリ**を選択
4. **Project Name**: `music-player-server` (任意)
5. **Framework Preset**: Other
6. **Root Directory**: `apps/server` を選択

#### 2-2. 環境変数の設定

以下の環境変数を設定：

| 変数名 | 値の例 | 説明 |
|--------|--------|------|
| `GOOGLE_CLIENT_ID` | `620477461173-xxx.apps.googleusercontent.com` | Google OAuth 2.0 クライアントID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Google OAuth 2.0 クライアントシークレット |
| `GOOGLE_REDIRECT_URI` | `https://music-player-server.vercel.app/auth/google/callback` | OAuth認証後のリダイレクトURI |
| `FRONTEND_URL` | `https://music-player-web.vercel.app` | フロントエンドのURL |
| `SERVER_PORT` | `3001` | サーバーポート（Vercelでは自動割り当て） |
| `NODE_ENV` | `production` | 環境 |
| `SESSION_SECRET` | `ランダムな文字列` | セッション暗号化キー（32文字以上推奨） |

**SESSION_SECRET の生成方法**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2-3. ビルド設定の確認

**Build & Development Settings**:
- **Framework Preset**: Other
- **Root Directory**: `apps/server`
- **Build Command**: `cd ../.. && pnpm build --filter=@music-player/server`
- **Output Directory**: `dist`
- **Install Command**: `cd ../.. && pnpm install`

### 3. Google Cloud Console の設定更新

バックエンドのURLが確定したら、Google Cloud Console を更新：

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. OAuth 2.0 クライアントID を選択
3. **承認済みのリダイレクト URI** に以下を追加：
   ```
   https://music-player-server.vercel.app/auth/google/callback
   ```
4. **承認済みの JavaScript 生成元** に以下を追加（フロントエンド用）：
   ```
   https://music-player-web.vercel.app
   ```
5. 変更を保存

### 4. フロントエンドの環境変数を更新

バックエンドのURLが確定したら、フロントエンドの環境変数を更新：

1. フロントエンドのVercelプロジェクトに移動
2. Settings → Environment Variables
3. `VITE_API_BASE_URL` を更新：
   ```
   https://music-player-server.vercel.app
   ```
4. Deployments → 最新のデプロイ → Redeploy

## 🔄 再デプロイ

コードを変更してGitにプッシュすると、Vercelが自動的に再デプロイします。

### 手動で再デプロイする場合

```bash
# Vercel CLI をインストール
npm i -g vercel

# フロントエンドをデプロイ
cd apps/web
vercel --prod

# バックエンドをデプロイ
cd apps/server
vercel --prod
```

## 🔐 セキュリティチェックリスト

- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] Google OAuth 2.0 のリダイレクトURIが正しい
- [ ] `SESSION_SECRET` が安全なランダム文字列
- [ ] `GOOGLE_CLIENT_SECRET` が環境変数で保護されている
- [ ] CORS設定が本番URLを許可している
- [ ] HttpOnly Cookie が `secure: true` (本番環境)

## 📊 デプロイ後の確認

### フロントエンド
- [ ] ログイン画面が表示される
- [ ] Googleログインボタンが動作する
- [ ] Google認証後、正しくリダイレクトされる

### バックエンド
- [ ] `GET /auth/status` が動作する
- [ ] Google OAuth フローが正常に完了する
- [ ] セッションが正しく保存される
- [ ] CORSエラーが発生しない

## 🐛 トラブルシューティング

### ビルドエラー: "command not found: pnpm"

Vercel設定でInstall Commandが正しいか確認：
```
cd ../.. && pnpm install
```

### CORS エラー

バックエンドの `FRONTEND_URL` 環境変数が正しいか確認。
`apps/server/src/index.ts` のCORS設定を確認。

### OAuth リダイレクトエラー

Google Cloud Console の設定を確認：
- 承認済みのリダイレクトURI
- 承認済みのJavaScript生成元

### モノレポのビルドが遅い

Turborepo のリモートキャッシュを有効にすると高速化：
```bash
pnpm turbo login
pnpm turbo link
```

## 📝 環境変数一覧（まとめ）

### フロントエンド（apps/web）

```bash
VITE_GOOGLE_CLIENT_ID=620477461173-xxx.apps.googleusercontent.com
VITE_API_BASE_URL=https://music-player-server.vercel.app
VITE_GOOGLE_DRIVE_FOLDER_ID=1hxrPx7JxNbqmLhJz-xd4FSkNgg44VOXq  # オプション
```

### バックエンド（apps/server）

```bash
GOOGLE_CLIENT_ID=620477461173-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://music-player-server.vercel.app/auth/google/callback
FRONTEND_URL=https://music-player-web.vercel.app
SERVER_PORT=3001
NODE_ENV=production
SESSION_SECRET=ランダムな32文字以上の文字列
```

## 🔗 関連ドキュメント

- [Vercel モノレポデプロイガイド](https://vercel.com/docs/monorepos)
- [Vercel 環境変数](https://vercel.com/docs/concepts/projects/environment-variables)
- [Google OAuth 2.0 設定](docs/GOOGLE_CLOUD_CONSOLE_SETUP.md)
- [ADR 002: モノレポアーキテクチャ](docs/adr/002-monorepo-architecture.md)
