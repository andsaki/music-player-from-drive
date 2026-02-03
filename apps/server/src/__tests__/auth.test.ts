import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import authRouter from '../routes/auth.js';
import { tokenManager } from '../utils/tokenManager.js';

// Google OAuth APIのモック
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        generateAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=true'),
        getToken: vi.fn().mockResolvedValue({
          tokens: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expiry_date: Date.now() + 3600000,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
          },
        }),
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-mock-access-token',
            expiry_date: Date.now() + 3600000,
          },
        }),
      })),
    },
  },
}));

describe('Authentication Routes', () => {
  let app: Express;

  beforeEach(() => {
    // テスト用のExpressアプリを作成
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/auth', authRouter);

    // 各テストの前にセッションをクリア
    tokenManager.clearAll();

    // 環境変数のモック
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback';
    process.env.FRONTEND_URL = 'http://localhost:5173';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth URL', async () => {
      const response = await request(app).get('/auth/google').expect(302);

      // リダイレクト先がGoogle OAuth URLであることを確認
      expect(response.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    });
  });

  describe('GET /auth/google/callback', () => {
    it('should exchange code for tokens and store them', async () => {
      // コールバックにアクセス
      const response = await request(app)
        .get('/auth/google/callback')
        .query({ code: 'mock-auth-code' })
        .expect(302);

      // フロントエンドにリダイレクトされることを確認
      expect(response.headers.location).toBe('http://localhost:5173?auth=success');

      // Cookieが設定されていることを確認
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;
      expect(sessionCookie).toContain('session_id=');
      expect(sessionCookie).toContain('HttpOnly');

      // セッションIDを取得
      const sessionId = sessionCookie?.match(/session_id=([^;]+)/)?.[1];
      expect(sessionId).toBeTruthy();

      // トークンが保存されていることを確認
      if (sessionId) {
        const tokenData = tokenManager.getToken(sessionId);
        expect(tokenData).toBeTruthy();
        expect(tokenData?.accessToken).toBe('mock-access-token');
        expect(tokenData?.refreshToken).toBe('mock-refresh-token');
      }
    });

    it('should return error if code is missing', async () => {
      const response = await request(app)
        .get('/auth/google/callback')
        .expect(400);

      expect(response.body).toEqual({ error: 'Authorization code not found' });
    });
  });

  describe('POST /auth/logout', () => {
    it('should delete session and clear cookie', async () => {
      // セッションを作成
      const sessionId = tokenManager.generateSessionId();
      tokenManager.setToken(sessionId, {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
        scope: 'test-scope',
      });

      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', `session_id=${sessionId}`)
        .expect(200);

      expect(response.body).toEqual({ success: true, message: 'Logged out successfully' });

      // Cookieがクリアされていることを確認
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies) ? cookies[0] : cookies).toContain('session_id=;');

      // セッションが削除されていることを確認
      expect(tokenManager.getToken(sessionId)).toBeNull();
    });

    it('should return 401 if session does not exist', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', 'session_id=non-existent-session')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should return 401 if no session cookie provided', async () => {
      const response = await request(app).post('/auth/logout').expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized: No session cookie' });
    });
  });

  describe('GET /auth/status', () => {
    it('should return authenticated: true for valid session', async () => {
      const sessionId = tokenManager.generateSessionId();
      const expiresAt = Date.now() + 3600000;
      tokenManager.setToken(sessionId, {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt,
        scope: 'test-scope',
      });

      const response = await request(app)
        .get('/auth/status')
        .set('Cookie', `session_id=${sessionId}`)
        .expect(200);

      expect(response.body).toEqual({
        authenticated: true,
        expiresAt,
        scope: 'test-scope',
      });
    });

    it('should return 401 for missing session', async () => {
      const response = await request(app).get('/auth/status').expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized: No session cookie' });
    });

    it('should return 401 for expired session', async () => {
      const sessionId = tokenManager.generateSessionId();
      tokenManager.setToken(sessionId, {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() - 1000, // 期限切れ
        scope: 'test-scope',
      });

      const response = await request(app)
        .get('/auth/status')
        .set('Cookie', `session_id=${sessionId}`)
        .expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized: Invalid or expired session' });
    });
  });

  describe('GET /auth/token', () => {
    it('should return access token for authenticated user', async () => {
      const sessionId = tokenManager.generateSessionId();
      const expiresAt = Date.now() + 3600000;
      tokenManager.setToken(sessionId, {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt,
        scope: 'test-scope',
      });

      const response = await request(app)
        .get('/auth/token')
        .set('Cookie', `session_id=${sessionId}`)
        .expect(200);

      expect(response.body).toEqual({
        accessToken: 'test-access-token',
        expiresAt,
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app).get('/auth/token').expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized: No session cookie' });
    });

    it('should refresh token if expiring soon', async () => {
      const sessionId = tokenManager.generateSessionId();
      const soonToExpire = Date.now() + 4 * 60 * 1000; // 4分後に期限切れ

      tokenManager.setToken(sessionId, {
        accessToken: 'old-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: soonToExpire,
        scope: 'test-scope',
      });

      const response = await request(app)
        .get('/auth/token')
        .set('Cookie', `session_id=${sessionId}`)
        .expect(200);

      // 新しいトークンが返されることを確認
      expect(response.body.accessToken).toBe('new-mock-access-token');
      expect(response.body.expiresAt).toBeGreaterThan(soonToExpire);

      // セッションが更新されていることを確認
      const updatedToken = tokenManager.getToken(sessionId);
      expect(updatedToken?.accessToken).toBe('new-mock-access-token');
    });
  });
});
