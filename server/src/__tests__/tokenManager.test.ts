import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokenManager } from '../utils/tokenManager.js';
import type { TokenData } from '../types/index.js';

describe('TokenManager', () => {
  beforeEach(() => {
    // 各テストの前に全セッションをクリア
    tokenManager.clearAll();
  });

  describe('generateSessionId', () => {
    it('should generate a unique session ID', () => {
      const sessionId1 = tokenManager.generateSessionId();
      const sessionId2 = tokenManager.generateSessionId();

      expect(sessionId1).toBeTruthy();
      expect(sessionId2).toBeTruthy();
      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toHaveLength(64); // 32 bytes in hex = 64 characters
    });
  });

  describe('setToken and getToken', () => {
    it('should store and retrieve token data', () => {
      const sessionId = 'test-session-123';
      const tokenData: TokenData = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        scope: 'https://www.googleapis.com/auth/drive.readonly',
      };

      tokenManager.setToken(sessionId, tokenData);
      const retrieved = tokenManager.getToken(sessionId);

      expect(retrieved).toEqual(tokenData);
    });

    it('should return null for non-existent session', () => {
      const retrieved = tokenManager.getToken('non-existent-session');
      expect(retrieved).toBeNull();
    });

    it('should return null and delete expired token', () => {
      const sessionId = 'expired-session';
      const tokenData: TokenData = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() - 1000, // 1 second ago (expired)
        scope: 'https://www.googleapis.com/auth/drive.readonly',
      };

      tokenManager.setToken(sessionId, tokenData);
      const retrieved = tokenManager.getToken(sessionId);

      expect(retrieved).toBeNull();
      // セッションが削除されているか確認
      expect(tokenManager.getActiveSessionCount()).toBe(0);
    });
  });

  describe('updateToken', () => {
    it('should update existing token data', () => {
      const sessionId = 'test-session';
      const initialData: TokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
      };

      tokenManager.setToken(sessionId, initialData);

      const updated = tokenManager.updateToken(sessionId, {
        accessToken: 'new-access-token',
        expiresAt: Date.now() + 7200000,
      });

      expect(updated).toBe(true);

      const retrieved = tokenManager.getToken(sessionId);
      expect(retrieved?.accessToken).toBe('new-access-token');
      expect(retrieved?.refreshToken).toBe('refresh-token'); // 変更されていない
    });

    it('should return false for non-existent session', () => {
      const updated = tokenManager.updateToken('non-existent', {
        accessToken: 'new-token',
      });

      expect(updated).toBe(false);
    });
  });

  describe('deleteToken', () => {
    it('should delete existing token', () => {
      const sessionId = 'test-session';
      const tokenData: TokenData = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
      };

      tokenManager.setToken(sessionId, tokenData);
      expect(tokenManager.getToken(sessionId)).toEqual(tokenData);

      tokenManager.deleteToken(sessionId);
      expect(tokenManager.getToken(sessionId)).toBeNull();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions and keep valid ones', () => {
      const now = Date.now();

      // 有効なセッション
      tokenManager.setToken('valid-session-1', {
        accessToken: 'token1',
        refreshToken: 'refresh1',
        expiresAt: now + 3600000, // 1 hour from now
        scope: 'scope',
      });

      tokenManager.setToken('valid-session-2', {
        accessToken: 'token2',
        refreshToken: 'refresh2',
        expiresAt: now + 7200000, // 2 hours from now
        scope: 'scope',
      });

      // 期限切れセッション
      tokenManager.setToken('expired-session-1', {
        accessToken: 'token3',
        refreshToken: 'refresh3',
        expiresAt: now - 1000, // 1 second ago
        scope: 'scope',
      });

      tokenManager.setToken('expired-session-2', {
        accessToken: 'token4',
        refreshToken: 'refresh4',
        expiresAt: now - 5000, // 5 seconds ago
        scope: 'scope',
      });

      expect(tokenManager.getActiveSessionCount()).toBe(4);

      tokenManager.cleanupExpiredSessions();

      expect(tokenManager.getActiveSessionCount()).toBe(2);
      expect(tokenManager.getToken('valid-session-1')).toBeTruthy();
      expect(tokenManager.getToken('valid-session-2')).toBeTruthy();
      expect(tokenManager.getToken('expired-session-1')).toBeNull();
      expect(tokenManager.getToken('expired-session-2')).toBeNull();
    });

    it('should log cleanup information', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const now = Date.now();
      tokenManager.setToken('expired-session', {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: now - 1000,
        scope: 'scope',
      });

      tokenManager.cleanupExpiredSessions();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TokenManager] Cleaned up 1 expired session')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return correct session count', () => {
      expect(tokenManager.getActiveSessionCount()).toBe(0);

      tokenManager.setToken('session-1', {
        accessToken: 'token1',
        refreshToken: 'refresh1',
        expiresAt: Date.now() + 3600000,
        scope: 'scope',
      });

      expect(tokenManager.getActiveSessionCount()).toBe(1);

      tokenManager.setToken('session-2', {
        accessToken: 'token2',
        refreshToken: 'refresh2',
        expiresAt: Date.now() + 3600000,
        scope: 'scope',
      });

      expect(tokenManager.getActiveSessionCount()).toBe(2);

      tokenManager.deleteToken('session-1');

      expect(tokenManager.getActiveSessionCount()).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should remove all sessions', () => {
      tokenManager.setToken('session-1', {
        accessToken: 'token1',
        refreshToken: 'refresh1',
        expiresAt: Date.now() + 3600000,
        scope: 'scope',
      });

      tokenManager.setToken('session-2', {
        accessToken: 'token2',
        refreshToken: 'refresh2',
        expiresAt: Date.now() + 3600000,
        scope: 'scope',
      });

      expect(tokenManager.getActiveSessionCount()).toBe(2);

      tokenManager.clearAll();

      expect(tokenManager.getActiveSessionCount()).toBe(0);
    });
  });
});
