// 環境変数の読み込み（最優先で実行）
import 'dotenv/config';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRouter from './routes/auth.js';
import { tokenManager } from './utils/tokenManager.js';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// クリーンアップインターバルID（グレースフルシャットダウン用）
let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * ミドルウェアの設定
 */

// Helmet: セキュリティヘッダーを設定
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS設定
const allowedOrigins = [
  'http://localhost:5173', // Vite開発サーバー
  'http://localhost:5174', // Vite開発サーバー（代替ポート）
  'http://localhost:3000', // 代替開発ポート
  process.env.FRONTEND_URL || '',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // originがundefinedの場合（同一オリジンリクエスト）は許可
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Cookieの送信を許可
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// JSONボディパーサー
app.use(express.json());

// Cookieパーサー
app.use(cookieParser());

/**
 * ルーティング
 */

// ヘルスチェックエンドポイント
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 認証ルート
app.use('/auth', authRouter);

// 404ハンドラー
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// エラーハンドラー
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

/**
 * サーバー起動
 */
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Music Player Authentication Server');
  console.log('='.repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('='.repeat(60));
  console.log('\nAvailable endpoints:');
  console.log('  GET  /health              - Health check');
  console.log('  GET  /auth/google         - Start Google OAuth');
  console.log('  GET  /auth/google/callback - Google OAuth callback');
  console.log('  POST /auth/logout         - Logout');
  console.log('  GET  /auth/status         - Check auth status');
  console.log('  GET  /auth/token          - Get access token');
  console.log('='.repeat(60));

  // 期限切れセッションの自動クリーンアップを設定
  // 理由:
  // 1. メモリリーク防止: 長期稼働時に期限切れセッションが溜まり続けるのを防ぐ
  // 2. セキュリティ: 古いトークンをメモリに残さない
  // 3. パフォーマンス: セッションストアのサイズを適正に保つ
  // 4. 運用安定性: 自動メンテナンスでサーバー再起動が不要
  //
  // 実行間隔: 1時間ごと
  // - 頻繁すぎる → CPU無駄
  // - 遅すぎる → メモリ圧迫
  // - 1時間 = バランスが良い
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1時間 (ミリ秒)

  cleanupIntervalId = setInterval(() => {
    tokenManager.cleanupExpiredSessions();
  }, CLEANUP_INTERVAL);

  console.log(`\n🧹 Session cleanup enabled (every ${CLEANUP_INTERVAL / 60000} minutes)`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    console.log('[Server] Session cleanup stopped');
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    console.log('[Server] Session cleanup stopped');
  }
  process.exit(0);
});
