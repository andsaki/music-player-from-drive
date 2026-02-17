import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import { type FolderSettingsModalProps } from "../types";

const FolderSettingsModal: React.FC<FolderSettingsModalProps> = ({
  open,
  onClose,
  folders,
  onDeleteFolder,
  onResetFolders,
}) => {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleResetConfirm = () => {
    onResetFolders();
    setConfirmResetOpen(false);
    onClose();
  };

  const registeredFolders = folders.filter((f) => f.id !== "all");
 
  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>フォルダ設定</DialogTitle>
        <DialogContent>
          {registeredFolders.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
              登録済みのフォルダはありません
            </Typography>
          ) : (
            <List disablePadding>
              {registeredFolders.map((folder) => (
                <ListItem
                  key={folder.id}
                  disablePadding
                  sx={{ py: 0.5 }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => onDeleteFolder(folder.id)}
                      sx={{ color: "text.secondary" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText primary={folder.name} />
                </ListItem>
              ))}
            </List>
          )}
          <Divider sx={{ mt: 2, mb: 1 }} />
          <Button
            size="small"
            onClick={() => setConfirmResetOpen(true)}
            disabled={registeredFolders.length === 0}
            sx={{
              color: "text.disabled",
              fontSize: "0.75rem",
              textTransform: "none",
              "&:hover": { color: "error.main" },
            }}
          >
            全フォルダをリセット
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)}>
        <DialogTitle>フォルダ設定をリセット</DialogTitle>
        <DialogContent>
          <DialogContentText>
            登録済みのフォルダをすべて削除します。この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmResetOpen(false)}>キャンセル</Button>
          <Button onClick={handleResetConfirm} color="error">
            リセット
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FolderSettingsModal;
