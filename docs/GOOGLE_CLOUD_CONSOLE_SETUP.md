# Google Cloud Console セットアップガイド

バックエンド認証サーバーを使用するには、Google Cloud Consoleで追加の設定が必要です。

## 必要な設定

### 1. Google Cloud Consoleにアクセス

https://console.cloud.google.com/

### 2. プロジェクトを選択

現在使用しているプロジェクトを選択します。

### 3. 認証情報ページに移動

1. 左側のメニューから「APIとサービス」→「認証情報」を選択
2. 既存のOAuth 2.0クライアントIDをクリック

### 4. クライアントシークレットを確認

**重要**: クライアントシークレットは、OAuth 2.0クライアントIDを作成した際に表示されています。

- すでにクライアントシークレットを持っている場合: そのまま使用
- クライアントシークレットを紛失した場合: 新しいクライアントIDを作成する必要があります

**クライアントシークレットの場所**:
- 認証情報ページで、既存のOAuth 2.0クライアントIDをクリック
- 「クライアントシークレット」フィールドに表示されています
- 表示されていない場合は、新しいクライアントIDを作成してください

### 5. リダイレクトURIを追加

OAuth 2.0クライアントIDの編集ページで：

**承認済みのリダイレクトURI** セクションに以下を追加：

#### 開発環境
```
http://localhost:3001/auth/google/callback
```

#### 本番環境（デプロイ時に追加）
```
https://your-domain.com/auth/google/callback
```

### 6. 変更を保存

「保存」ボタンをクリックして変更を適用します。

## .envファイルの更新

1. プロジェクトのルートディレクトリにある `.env` ファイルを開く

2. 以下の値を更新：

```bash
# Google Cloud Consoleから取得
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# 開発環境
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:5173
SERVER_PORT=3001
NODE_ENV=development
```

**重要な注意事項**:
- `GOOGLE_CLIENT_SECRET` は **絶対に公開しないこと**
- `.env` ファイルは `.gitignore` に追加されているか確認
- 本番環境では環境変数を安全に管理（Vercel環境変数など）

## トラブルシューティング

### エラー: "redirect_uri_mismatch"

**原因**: リダイレクトURIが一致していません

**解決方法**:
1. Google Cloud Consoleで設定したリダイレクトURIを確認
2. `.env` ファイルの `GOOGLE_REDIRECT_URI` が完全に一致しているか確認
3. 末尾の `/` に注意（ある場合とない場合で異なります）

### エラー: "invalid_client"

**原因**: クライアントIDまたはクライアントシークレットが間違っています

**解決方法**:
1. Google Cloud Consoleで正しいクライアントIDとシークレットをコピー
2. `.env` ファイルに正確に貼り付け
3. 余分なスペースや改行がないか確認

### リフレッシュトークンが取得できない

**原因**: `access_type: 'offline'` と `prompt: 'consent'` が必要です

**解決方法**:
- すでにコードに含まれています（`server/src/routes/auth.ts:34-35`）
- それでも取得できない場合、Google Cloud Consoleでアプリの承認を取り消してから再度ログイン

**アプリの承認を取り消す方法**:
1. https://myaccount.google.com/permissions にアクセス
2. アプリを見つけてアクセス権を削除
3. 再度ログインして、リフレッシュトークンを取得

## セキュリティのベストプラクティス

### 開発環境

- ✅ `localhost` のリダイレクトURIのみを使用
- ✅ `.env` ファイルをバージョン管理に含めない
- ✅ クライアントシークレットを共有しない

### 本番環境

- ✅ HTTPS通信のみを使用
- ✅ 環境変数を安全に管理（Vercel/Railway環境変数など）
- ✅ 本番用の別のOAuth 2.0クライアントIDを作成（推奨）
- ✅ 承認済みドメインを制限
- ✅ 定期的にクライアントシークレットをローテーション

## 次のステップ

設定が完了したら：

1. バックエンドサーバーを起動:
   ```bash
   cd server
   npm run dev
   ```

2. フロントエンドを起動（別ターミナル）:
   ```bash
   npm run dev
   ```

3. ブラウザで `http://localhost:5173` にアクセス

4. 「Googleでログイン」ボタンをクリックして動作確認

## 参考リンク

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2)
