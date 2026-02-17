import React, { useState, useEffect } from "react";
// MUI コンポーネントを個別インポート（バンドルサイズ最適化）
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import { type FolderManagementProps } from "../types";

/**
 * フォルダ管理モーダルコンポーネント。
 * Google DriveのフォルダIDを追加・管理します。
 */
const FolderManagement: React.FC<FolderManagementProps> = ({
  open,
  onClose,
  onAddFolder,
  accessToken,
}) => {
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFolderName = async () => {
      if (folderId && accessToken) {
        setLoading(true);
        setError(null);
        try {
          const response = await axios.get(
            `https://www.googleapis.com/drive/v3/files/${folderId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              params: {
                fields: "name,mimeType",
              },
            },
          );
          if (response.data.mimeType === "application/vnd.google-apps.folder") {
            setFolderName(response.data.name);
          } else {
            setError("The provided ID is not a folder ID.");
            setFolderName("");
          }
        } catch (err) {
          console.error("Error fetching folder name:", err);
          setError("Failed to fetch folder name. Please check the ID.");
          setFolderName("");
        } finally {
          setLoading(false);
        }
      } else {
        setFolderName("");
        setError(null);
      }
    };
    fetchFolderName();
  }, [folderId, accessToken]);

  const handleAdd = () => {
    if (folderId && folderName) {
      onAddFolder({ id: folderId, name: folderName });
      setFolderId("");
      setFolderName("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add New Folder</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Folder ID"
          type="password"
          fullWidth
          variant="standard"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          error={!!error}
          helperText={error}
        />
        <TextField
          margin="dense"
          label="Folder Name"
          type="text"
          fullWidth
          variant="standard"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          disabled={loading || !!error}
          InputProps={{
            endAdornment: loading ? <CircularProgress size={20} /> : null,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={!folderId || !folderName || loading || !!error}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FolderManagement;
