import { Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { SESSION_COOKIE_NAME, TOKEN_REFRESH_MARGIN } from '@music-player/shared';
import { tokenManager } from '../utils/tokenManager.js';
import { TokenData, AuthenticatedRequest } from '../types/index.js';

/**
 * 認証ミドルウェア
 * リクエストのCookieからセッションIDを取得し、トークンデータを検証
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({ error: 'Unauthorized: No session cookie' });
      return;
    }

    // セッションからトークンデータを取得
    let tokenData = tokenManager.getToken(sessionId);

    if (!tokenData) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
      return;
    }

    // アクセストークンの有効期限チェック（期限切れの5分前に更新を試みる）
    const now = Date.now();

    if (now + TOKEN_REFRESH_MARGIN > tokenData.expiresAt && tokenData.refreshToken) {
      console.log('[AuthMiddleware] Access token about to expire, refreshing...');

      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
          refresh_token: tokenData.refreshToken,
        });

        // トークンをリフレッシュ
        const { credentials } = await oauth2Client.refreshAccessToken();

        if (credentials.access_token) {
          // 新しいトークンデータを作成
          const newTokenData: TokenData = {
            accessToken: credentials.access_token,
            refreshToken: tokenData.refreshToken, // リフレッシュトークンは変わらない
            expiresAt: Date.now() + (credentials.expiry_date ? credentials.expiry_date - Date.now() : 3600 * 1000),
            scope: tokenData.scope,
          };

          // セッションを更新
          tokenManager.updateToken(sessionId, newTokenData);
          tokenData = newTokenData;

          console.log('[AuthMiddleware] Access token refreshed successfully');
        }
      } catch (refreshError) {
        console.error('[AuthMiddleware] Failed to refresh token:', refreshError);
        // リフレッシュに失敗した場合、セッションを削除
        tokenManager.deleteToken(sessionId);
        res.clearCookie(SESSION_COOKIE_NAME);
        res.status(401).json({ error: 'Unauthorized: Token refresh failed' });
        return;
      }
    }

    // リクエストオブジェクトにセッション情報を追加
    req.sessionId = sessionId;
    req.tokenData = tokenData;

    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
