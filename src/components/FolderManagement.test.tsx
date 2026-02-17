import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import FolderManagement from "./FolderManagement";

vi.mock("axios");
const mockedAxios = vi.mocked(axios);

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onAddFolder: vi.fn(),
  accessToken: "test-token",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FolderManagement", () => {
  it("初期状態で Add ボタンが無効", () => {
    render(<FolderManagement {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("正しいフォルダIDを入力すると folderName が自動入力されて Add が有効になる", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { name: "My Music", mimeType: "application/vnd.google-apps.folder" },
    });

    render(<FolderManagement {...defaultProps} />);
    await userEvent.type(screen.getByLabelText("Folder ID"), "valid-folder-id");

    await waitFor(() => {
      expect(screen.getByLabelText("Folder Name")).toHaveValue("My Music");
    });
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("存在しないフォルダIDを入力するとエラーが表示されて Add が無効のまま", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
      message: "Not Found",
    });

    render(<FolderManagement {...defaultProps} />);
    await userEvent.type(screen.getByLabelText("Folder ID"), "wrong-id");

    await waitFor(() => {
      expect(
        screen.getByText("Failed to fetch folder name. Please check the ID."),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("フォルダIDがフォルダでない場合にエラーが表示される", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { name: "Not a folder", mimeType: "application/vnd.google-apps.document" },
    });

    render(<FolderManagement {...defaultProps} />);
    await userEvent.type(screen.getByLabelText("Folder ID"), "file-id-not-folder");

    await waitFor(() => {
      expect(
        screen.getByText("The provided ID is not a folder ID."),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("エラー時は Folder Name フィールドが入力不可", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Network Error"));

    render(<FolderManagement {...defaultProps} />);
    await userEvent.type(screen.getByLabelText("Folder ID"), "bad-id");

    await waitFor(() => {
      expect(screen.getByLabelText("Folder Name")).toBeDisabled();
    });
  });

  it("Add クリックで onAddFolder が正しい引数で呼ばれる", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { name: "My Music", mimeType: "application/vnd.google-apps.folder" },
    });

    render(<FolderManagement {...defaultProps} />);
    await userEvent.type(screen.getByLabelText("Folder ID"), "valid-id");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith({
      id: "valid-id",
      name: "My Music",
    });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("Cancel クリックで onClose が呼ばれる", async () => {
    render(<FolderManagement {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
