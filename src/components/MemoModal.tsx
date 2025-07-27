import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { type MemoModalProps } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';

/**
 * メモモーダルコンポーネント。
 * フォルダごとにメモを保存・表示します。
 */
const MemoModal: React.FC<MemoModalProps> = ({ open, onClose, folderId, folderName }) => {
  const [memoText, setMemoText] = useState('');

  // folderIdとopenの状態に基づいてメモを読み込む
  useEffect(() => {
    if (open && folderId) {
      const memoKey = `${LOCAL_STORAGE_KEYS.USER_MEMO_PREFIX}${folderId}`;
      const savedMemo = localStorage.getItem(memoKey);
      if (savedMemo) {
        setMemoText(savedMemo);
      } else {
        setMemoText(''); // フォルダにメモがない場合はクリア
      }
    }
  }, [open, folderId]);

  // メモを保存するハンドラ
  const handleSaveMemo = () => {
    if (folderId) {
      const memoKey = `${LOCAL_STORAGE_KEYS.USER_MEMO_PREFIX}${folderId}`;
      localStorage.setItem(memoKey, memoText);
    }
    onClose();
  };

  // モーダルが閉じられたときにメモを保存する（CloseボタンでもSaveボタンでも）
  const handleClose = () => {
    if (folderId) {
      const memoKey = `${LOCAL_STORAGE_KEYS.USER_MEMO_PREFIX}${folderId}`;
      localStorage.setItem(memoKey, memoText);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Memo for Folder: {folderName}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Your Memo"
          type="text"
          fullWidth
          multiline
          rows={10}
          variant="outlined"
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button onClick={handleSaveMemo}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemoModal;
