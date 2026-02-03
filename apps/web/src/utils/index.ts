/**
 * Google DriveのファイルIDから共有リンクを生成します。
 * @param fileId - Google DriveのファイルID。
 * @returns 生成された共有リンクのURL。
 */
export const generateShareLink = (fileId: string) => {
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
};

/**
 * 指定されたテキストをクリップボードにコピーします。
 * @param text - クリップボードにコピーするテキスト。
 * @returns コピーの成否とメッセージを含むオブジェクト。
 */
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, message: "共有リンクをコピーしました！" };
  } catch (err) {
    console.error("Failed to copy: ", err);
    return { success: false, message: "共有リンクのコピーに失敗しました。" };
  }
};
