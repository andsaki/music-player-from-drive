import type { DriveFile } from "../types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const CACHE_PREFIX = "music_player_cache_";

/**
 * キャッシュユーティリティクラス
 * localStorageを使用してデータを時間制限付きでキャッシュ
 */
export class CacheManager {
  /**
   * データをキャッシュに保存
   * @param key キャッシュキー
   * @param data 保存するデータ
   * @param ttl Time To Live（ミリ秒）、デフォルトは5分
   */
  static set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    try {
      localStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.warn("キャッシュの保存に失敗しました:", error);
    }
  }

  /**
   * キャッシュからデータを取得
   * @param key キャッシュキー
   * @returns キャッシュされたデータ、または null（有効期限切れ/存在しない場合）
   */
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      // TTLチェック: 有効期限が切れていたら削除してnullを返す
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn("キャッシュの読み取りに失敗しました:", error);
      return null;
    }
  }

  /**
   * 特定のキャッシュを削除
   * @param key キャッシュキー
   */
  static delete(key: string): void {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn("キャッシュの削除に失敗しました:", error);
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("キャッシュのクリアに失敗しました:", error);
    }
  }

  /**
   * キャッシュが存在するかチェック（有効期限も考慮）
   * @param key キャッシュキー
   * @returns キャッシュが有効な場合 true
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }
}

/**
 * 音楽ファイルリスト専用のキャッシュキーを生成
 * @param folderId フォルダID
 * @returns キャッシュキー
 */
export function getMusicFilesCacheKey(folderId: string): string {
  return `music_files_${folderId}`;
}

/**
 * フォルダメタデータ専用のキャッシュキーを生成
 * @param folderId フォルダID
 * @returns キャッシュキー
 */
export function getFolderMetadataCacheKey(folderId: string): string {
  return `folder_metadata_${folderId}`;
}

/**
 * 音楽ファイルリストをキャッシュ
 * @param folderId フォルダID
 * @param files ファイルリスト
 * @param ttl Time To Live（デフォルト: 10分）
 */
export function cacheMusicFiles(
  folderId: string,
  files: DriveFile[],
  ttl: number = 10 * 60 * 1000
): void {
  CacheManager.set(getMusicFilesCacheKey(folderId), files, ttl);
}

/**
 * キャッシュされた音楽ファイルリストを取得
 * @param folderId フォルダID
 * @returns キャッシュされたファイルリスト、または null
 */
export function getCachedMusicFiles(folderId: string): DriveFile[] | null {
  return CacheManager.get<DriveFile[]>(getMusicFilesCacheKey(folderId));
}

/**
 * フォルダメタデータをキャッシュ
 * @param folderId フォルダID
 * @param metadata メタデータ（name, mimeType等）
 * @param ttl Time To Live（デフォルト: 30分）
 */
export function cacheFolderMetadata(
  folderId: string,
  metadata: { name: string; mimeType: string },
  ttl: number = 30 * 60 * 1000
): void {
  CacheManager.set(getFolderMetadataCacheKey(folderId), metadata, ttl);
}

/**
 * キャッシュされたフォルダメタデータを取得
 * @param folderId フォルダID
 * @returns キャッシュされたメタデータ、または null
 */
export function getCachedFolderMetadata(
  folderId: string
): { name: string; mimeType: string } | null {
  return CacheManager.get<{ name: string; mimeType: string }>(
    getFolderMetadataCacheKey(folderId)
  );
}
