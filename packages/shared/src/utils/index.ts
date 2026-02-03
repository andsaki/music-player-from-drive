/**
 * ミリ秒を秒に変換
 */
export function msToSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

/**
 * 秒をミリ秒に変換
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
