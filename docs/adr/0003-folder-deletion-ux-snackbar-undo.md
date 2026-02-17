# ADR-0003: フォルダ削除UIにSnackbar + Undoパターンを採用する

## ステータス

**Accepted** - 2026-02-17

## コンテキスト

FolderSettingsModal にフォルダ個別削除ボタンを実装する際、誤削除防止のためのUXパターンを検討した。

### 要件

- 誤操作によるフォルダ削除を防ぐ手段が必要
- フォルダが削除されると localStorage から消えるため、復元手段がない（PWA）
- 操作を邪魔しない軽快なUXが望ましい

### 検討した選択肢

1. **確認ダイアログ（Dialog on Dialog）**
2. **インライン確認（行をフォームに変形）**
3. **Snackbar + Undo（Gmailスタイル）**

## 経緯

### 案1: 確認ダイアログ（却下）

FolderSettingsModal（Dialog）の上にさらに確認Dialog を重ねる実装を試みた。

```
FolderSettingsModal (Dialog z-index 1300)
  └── 確認 Dialog (z-index 1300+)
```

**問題**:
- Dialog on Dialog は視覚的に不自然（背景が二重に暗くなる）
- MUIの z-index 管理が複雑になる
- 「削除ボタンを押す → また確認ダイアログが出る」という二度手間

→ **却下**

### 案2: インライン確認（却下）

削除ボタンを押すと、その行が「削除しますか？ [キャンセル] [削除]」に変形する実装。

**問題**:
- テキストサイズが小さく視認性が悪い（`body2`でも改善不十分）
- フォルダ名が確認テキストで隠れる
- リストの高さが変動してレイアウトがずれる

→ **却下**

### 案3: Snackbar + Undo（採用）

即時削除して4秒間「元に戻す」ボタン付きSnackbarを表示するパターン（Gmailの「メールを削除しました」と同じ）。

## 決定内容

**Snackbar + Undo パターンを採用する**

## 実装詳細

### フロー

```
ユーザーが🗑をクリック
  → FolderSettingsModal を閉じる（Snackbarが見えるようにするため）
  → folderOptions からフォルダを即時削除
  → Snackbar表示（4秒）: 「「{フォルダ名}」を削除しました」+ [元に戻す] ボタン
  → [元に戻す] クリック: folderOptions にフォルダを再追加
  → 4秒経過 or [×] クリック: Snackbarを閉じる、undoFolder をクリア
```

### 状態管理（App.tsx）

```ts
const [undoFolder, setUndoFolder] = useState<FolderOption | null>(null);

const handleDeleteFolder = (folderId: string) => {
  const deleted = folderOptions.find((f) => f.id === folderId) ?? null;
  setFolderOptions((prev) => prev.filter((f) => f.id !== folderId));
  setOpenFolderSettings(false); // Snackbarが見えるようモーダルを閉じる
  if (deleted) {
    setUndoFolder(deleted);
    setSnackbarMessage(`「${deleted.name}」を削除しました`);
    setSnackbarOpen(true);
  }
};
```

### Snackbarのaction

```tsx
action={
  <>
    {undoFolder && (
      <Button size="small" color="inherit" onClick={() => {
        setFolderOptions((prev) => [...prev, undoFolder]);
        setUndoFolder(null);
        setSnackbarOpen(false);
      }}>
        元に戻す
      </Button>
    )}
    <IconButton size="small" color="inherit" onClick={handleSnackbarClose}>
      <CloseIcon fontSize="small" />
    </IconButton>
  </>
}
```

### 注意点: Snackbarの共用

`snackbarOpen` / `snackbarMessage` はシェアリンクのコピー通知と共用している。
シェアボタンを押した際に `undoFolder` が残っていると「元に戻す」ボタンが誤表示されるため、
`handleShareClick` でも `setUndoFolder(null)` を呼ぶ。

```ts
const handleShareClick = async (e: React.MouseEvent, fileId: string) => {
  e.stopPropagation();
  const result = await copyToClipboard(generateShareLink(fileId));
  setUndoFolder(null); // ← undoFolder をクリアしてから開く
  setSnackbarMessage(result.message);
  setSnackbarOpen(true);
};
```

### FolderSettingsModalを閉じる理由

MUIのz-index階層:
- Dialog: 1300
- Snackbar: 1400

Snackbarの z-index はDialogより高いが、Dialogのbackdrop（オーバーレイ）が視覚的にSnackbarを覆い隠してしまう。
削除ボタンを押した時点でモーダルを閉じることで、Snackbarが正常に表示される。

## 結果と影響

### ポジティブな影響

✅ **軽快なUX**: 確認なしで即削除、必要なら元に戻せる
✅ **視覚的なシンプルさ**: Dialogが重なる問題がない
✅ **Gmailなど主要アプリと同じパターン**: ユーザーが直感的に理解できる
✅ **全リセットとの使い分け**: 個別削除 → Snackbar+Undo、全リセット → 確認Dialog（重大操作のため）

### ネガティブな影響

⚠️ **4秒以内に気づかないと復元不可**: 長時間のUndoウィンドウは設けない（localStorage同期の複雑化を避けるため）
⚠️ **モーダルが閉じてしまう**: 削除後にFolderSettingsModalが閉じるため、続けて複数フォルダを削除する際は再度開く必要がある

## 関連

- [Nielsen Norman Group: Confirmation Dialog vs. Undo](https://www.nngroup.com/articles/confirmation-dialog/)
- MUI Snackbar: `autoHideDuration={4000}`
- 実装コミット: FolderSettingsModal作成 + Snackbar+Undo実装

---

**決定者**: Development Team
**承認日**: 2026-02-17
