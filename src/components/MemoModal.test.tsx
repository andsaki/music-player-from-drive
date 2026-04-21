import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemoModal from "./MemoModal";

vi.mock("../utils/driveTodo", () => ({
  findTodoFileInFolder: vi.fn(),
  readTodoFile: vi.fn(),
  createTodoFile: vi.fn(),
  updateTodoFile: vi.fn(),
}));

vi.mock("../utils/notionTodo", () => ({
  isNotionSyncConfigured: () => false,
  loadTasksFromNotion: vi.fn(),
  saveTasksToNotion: vi.fn(),
}));

import { findTodoFileInFolder } from "../utils/driveTodo";

const mockedFindTodoFileInFolder = vi.mocked(findTodoFileInFolder);

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  folderId: "folder-1",
  folderName: "Test Folder",
  accessToken: "test-token",
  onAuthError: vi.fn(),
};

describe("MemoModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("Drive に TODO.md が無くても localStorage の下書きを表示する", async () => {
    mockedFindTodoFileInFolder.mockResolvedValue(null);
    localStorage.setItem(
      "userMemo_folder-1",
      JSON.stringify([{ id: "task-1", text: "下書きタスク", completed: false }]),
    );

    render(<MemoModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("下書きタスク")).toBeInTheDocument();
    });

    expect(
      screen.getByText("このフォルダには TODO.md がまだありません。端末内の下書きを表示しています。保存すると新規作成します。"),
    ).toBeInTheDocument();
  });

  it("Drive 再読込で TODO.md が無いときも localStorage の下書きを維持する", async () => {
    mockedFindTodoFileInFolder.mockResolvedValue(null);
    localStorage.setItem(
      "userMemo_folder-1",
      JSON.stringify([{ id: "task-1", text: "再読込タスク", completed: false }]),
    );

    render(<MemoModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("再読込タスク")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Driveから再読込" }));

    await waitFor(() => {
      expect(screen.getByText("再読込タスク")).toBeInTheDocument();
    });

    expect(
      screen.getByText("このフォルダには TODO.md がありません。端末内の下書きを表示しています。"),
    ).toBeInTheDocument();
  });
});
