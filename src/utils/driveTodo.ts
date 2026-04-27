import { TODO_FILE_NAME } from "../constants";
import { googleApiJson, googleApiText } from "./googleApi";

export interface DriveTodoFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

const buildMultipartBody = (metadata: Record<string, unknown>, content: string, boundary: string) => {
  return [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: text/markdown; charset=UTF-8",
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");
};

export const findTodoFileInFolder = async (accessToken: string, folderId: string) => {
  const response = await googleApiJson<{ files?: DriveTodoFile[] }>(
    "https://www.googleapis.com/drive/v3/files",
    accessToken,
    undefined,
    {
      q: `'${folderId}' in parents and name='${TODO_FILE_NAME}' and trashed=false`,
      fields: "files(id,name,modifiedTime)",
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    },
  );

  return response.files?.[0] ?? null;
};

export const readTodoFile = async (accessToken: string, fileId: string) => {
  return googleApiText(`https://www.googleapis.com/drive/v3/files/${fileId}`, accessToken, undefined, {
    alt: "media",
  });
};

export const createTodoFile = async (accessToken: string, folderId: string, content: string) => {
  const boundary = `todo-upload-${Date.now()}`;
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: buildMultipartBody(
        {
          name: TODO_FILE_NAME,
          parents: [folderId],
          mimeType: "text/markdown",
        },
        content,
        boundary,
      ),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create TODO.md: ${response.status}`);
  }

  return (await response.json()) as DriveTodoFile;
};

export const updateTodoFile = async (accessToken: string, fileId: string, content: string) => {
  const boundary = `todo-upload-${Date.now()}`;
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&supportsAllDrives=true`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: buildMultipartBody(
        {
          mimeType: "text/markdown",
        },
        content,
        boundary,
      ),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to update TODO.md: ${response.status}`);
  }

  return (await response.json()) as DriveTodoFile;
};
