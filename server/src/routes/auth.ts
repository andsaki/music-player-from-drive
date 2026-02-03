import express, { Request, Response } from 'express';
import { google } from 'googleapis';
import { tokenManager } from '../utils/tokenManager.js';
import { TokenData, AuthenticatedRequest } from '../types/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * OAuth 2.0クライアントの設定
 */
console.log('[Auth] Initializing OAuth2 client...');
console.log('[Auth] CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('[Auth] CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('[Auth] REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * GET /auth/google
 * Google OAuth 2.0認証開始エンドポイント
 */
router.get('/google', (_req: Request, res: Response) => {
  console.log('[Auth] Starting Google OAuth flow');

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // リフレッシュトークンを取得するために必須
    scope: scopes,
    prompt: 'consent', // 毎回同意画面を表示してリフレッシュトークンを確実に取得
  });

  console.log('[Auth] Redirecting to Google OAuth URL');
  res.redirect(authUrl);
});

/**
 * GET /auth/google/callback
 * Google OAuth 2.0コールバックエンドポイント
 */
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string;

    if (!code) {
      console.error('[Auth] No authorization code received');
      res.status(400).json({ error: 'Authorization code not found' });
      return;
    }

    console.log('[Auth] Received authorization code, exchanging for tokens...');

    // Authorization Codeをトークンに交換
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      console.error('[Auth] No access token received');
      res.status(500).json({ error: 'Failed to obtain access token' });
      return;
    }

    if (!tokens.refresh_token) {
      console.error('[Auth] No refresh token received');
      res.status(500).json({ error: 'Failed to obtain refresh token' });
      return;
    }

    console.log('[Auth] Successfully obtained tokens');

    // トークンデータを作成
    const tokenData: TokenData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expiry_date ? tokens.expiry_date - Date.now() : 3600 * 1000),
      scope: tokens.scope || '',
    };

    // セッションIDを生成
    const sessionId = tokenManager.generateSessionId();

    // トークンデータを保存
    tokenManager.setToken(sessionId, tokenData);

    // HttpOnly Cookieを設定
    res.cookie('session_id', sessionId, {
      httpOnly: true, // JavaScriptからアクセス不可
      secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
      sameSite: 'lax', // CSRF対策
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
      path: '/',
    });

    console.log('[Auth] Session cookie set successfully');

    // フロントエンドにリダイレクト
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('[Auth] Error during callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=error`);
  }
});

/**
 * POST /auth/logout
 * ログアウトエンドポイント
 */
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.sessionId;

    if (sessionId) {
      tokenManager.deleteToken(sessionId);
      console.log(`[Auth] User logged out, session deleted: ${sessionId}`);
    }

    // Cookieをクリア
    res.clearCookie('session_id');

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Auth] Error during logout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/status
 * 認証状態を確認するエンドポイント
 */
router.get('/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tokenData = req.tokenData;

    if (!tokenData) {
      res.status(401).json({ error: 'Unauthorized: No token data' });
      return;
    }

    res.json({
      authenticated: true,
      expiresAt: tokenData.expiresAt,
      scope: tokenData.scope,
    });
  } catch (error) {
    console.error('[Auth] Error checking status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/token
 * アクセストークンを取得するエンドポイント（Drive APIコール用）
 */
router.get('/token', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tokenData = req.tokenData;

    if (!tokenData) {
      res.status(401).json({ error: 'Unauthorized: No token data' });
      return;
    }

    // アクセストークンのみを返す（リフレッシュトークンは返さない）
    res.json({
      accessToken: tokenData.accessToken,
      expiresAt: tokenData.expiresAt,
    });
  } catch (error) {
    console.error('[Auth] Error retrieving token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
