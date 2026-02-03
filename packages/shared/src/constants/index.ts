/**
 * セッション関連の定数
 */
export const SESSION_COOKIE_NAME = 'session_id';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7日間（ミリ秒）
export const TOKEN_REFRESH_MARGIN = 5 * 60 * 1000; // トークン期限切れ5分前にリフレッシュ

/**
 * API エンドポイント
 */
export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE: '/auth/google',
    CALLBACK: '/auth/google/callback',
    STATUS: '/auth/status',
    TOKEN: '/auth/token',
    LOGOUT: '/auth/logout',
  },
} as const;

/**
 * 対応する音楽ファイルのMIMEタイプ
 */
export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/flac',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
] as const;

/**
 * エラーコード
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  GOOGLE_API_ERROR: 'GOOGLE_API_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;
