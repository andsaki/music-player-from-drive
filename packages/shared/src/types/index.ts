/**
 * Google Drive ファイル情報
 */
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

/**
 * 認証状態
 */
export interface AuthStatus {
  authenticated: boolean;
  user?: {
    email: string;
    name: string;
    picture?: string;
  };
}

/**
 * API エラー
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * トークン情報
 */
export interface TokenInfo {
  accessToken: string;
  expiresAt: number;
  scope?: string;
}
