/**
 * Google OAuth 2.0 トークンレスポンス
 */
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * セッション管理用のトークンデータ
 */
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  scope: string;
}

/**
 * セッションストア（メモリベース）
 * Key: sessionId, Value: TokenData
 */
export interface SessionStore {
  [sessionId: string]: TokenData;
}

/**
 * 認証されたリクエストの拡張型
 */
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  sessionId?: string;
  tokenData?: TokenData;
}
