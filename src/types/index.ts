export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents: string[];
}

export interface FolderOption {
  id: string;
  name: string;
}

export interface FolderManagementProps {
  open: boolean;
  onClose: () => void;
  onAddFolder: (folder: FolderOption) => void;
  accessToken: string | null;
}

export interface MemoModalProps {
  open: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
}
