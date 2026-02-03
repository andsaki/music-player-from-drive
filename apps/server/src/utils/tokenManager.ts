import { randomBytes } from 'crypto';
import { TokenData, SessionStore } from '../types/index.js';

/**
 * トークン管理クラス
 * メモリベースのシンプルなセッションストア
 *
 * 注意: 本番環境では Redis や データベース を使用することを推奨
 */
class TokenManager {
  private sessions: SessionStore = {};

  /**
   * 新しいセッションIDを生成
   */
  generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * トークンデータを保存
   */
  setToken(sessionId: string, tokenData: TokenData): void {
    this.sessions[sessionId] = tokenData;
    console.log(`[TokenManager] Session created: ${sessionId}`);
  }

  /**
   * トークンデータを取得
   */
  getToken(sessionId: string): TokenData | null {
    const tokenData = this.sessions[sessionId];

    if (!tokenData) {
      console.log(`[TokenManager] Session not found: ${sessionId}`);
      return null;
    }

    // トークンの有効期限をチェック
    if (Date.now() > tokenData.expiresAt) {
      console.log(`[TokenManager] Session expired: ${sessionId}`);
      this.deleteToken(sessionId);
      return null;
    }

    return tokenData;
  }

  /**
   * トークンデータを更新
   */
  updateToken(sessionId: string, tokenData: Partial<TokenData>): boolean {
    const existingToken = this.sessions[sessionId];

    if (!existingToken) {
      console.log(`[TokenManager] Cannot update, session not found: ${sessionId}`);
      return false;
    }

    this.sessions[sessionId] = {
      ...existingToken,
      ...tokenData,
    };

    console.log(`[TokenManager] Session updated: ${sessionId}`);
    return true;
  }

  /**
   * トークンデータを削除
   */
  deleteToken(sessionId: string): void {
    delete this.sessions[sessionId];
    console.log(`[TokenManager] Session deleted: ${sessionId}`);
  }

  /**
   * 全てのセッションをクリア（テスト用）
   */
  clearAll(): void {
    this.sessions = {};
    console.log('[TokenManager] All sessions cleared');
  }

  /**
   * アクティブなセッション数を取得
   */
  getActiveSessionCount(): number {
    return Object.keys(this.sessions).length;
  }

  /**
   * 期限切れセッションをクリーンアップ
   *
   * 理由:
   * 1. メモリリーク防止 - 期限切れセッションが溜まり続けるとメモリを圧迫
   * 2. パフォーマンス維持 - セッションオブジェクトが肥大化するとルックアップが遅くなる
   * 3. セキュリティ - 古いトークンが残り続けると攻撃対象が増える
   * 4. サーバー安定性 - 長期稼働時のメモリ使用量を適正に保つ
   *
   * 個人利用でも重要な理由:
   * - 1ヶ月稼働すると、毎日ログインで30セッション溜まる
   * - 各セッションは数KB = 30日で数MB無駄に消費
   * - サーバーの定期メンテナンスが不要になる
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const sessionId in this.sessions) {
      const tokenData = this.sessions[sessionId];

      if (now > tokenData.expiresAt) {
        delete this.sessions[sessionId];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[TokenManager] Cleaned up ${cleanedCount} expired session(s)`);
      console.log(`[TokenManager] Active sessions: ${this.getActiveSessionCount()}`);
    }
  }
}

// シングルトンインスタンス
export const tokenManager = new TokenManager();
