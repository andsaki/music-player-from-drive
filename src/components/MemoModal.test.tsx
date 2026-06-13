import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemoModal from "./MemoModal";

const notionMocks = vi.hoisted(() => ({
  isConfigured: false,
  loadTasksFromNotion: vi.fn(),
  saveTasksToNotion: vi.fn(),
}));

vi.mock("../utils/driveTodo", () => ({
  findTodoFileInFolder: vi.fn(),
  readTodoFile: vi.fn(),
  createTodoFile: vi.fn(),
  updateTodoFile: vi.fn(),
}));

vi.mock("../utils/notionTodo", () => ({
  isNotionSyncConfigured: () => notionMocks.isConfigured,
  loadTasksFromNotion: notionMocks.loadTasksFromNotion,
  saveTasksToNotion: notionMocks.saveTasksToNotion,
}));

import { findTodoFileInFolder } from "../utils/driveTodo";
import { loadTasksFromNotion } from "../utils/notionTodo";

const mockedFindTodoFileInFolder = vi.mocked(findTodoFileInFolder);
const mockedLoadTasksFromNotion = vi.mocked(loadTasksFromNotion);

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
    notionMocks.isConfigured = false;
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

  it("Notion に App TODO が無いときは現在の TODO を消さない", async () => {
    notionMocks.isConfigured = true;
    mockedFindTodoFileInFolder.mockResolvedValue(null);
    mockedLoadTasksFromNotion.mockResolvedValue({ found: false, tasks: [] });
    localStorage.setItem(
      "userMemo_folder-1",
      JSON.stringify([{ id: "task-1", text: "消したくないタスク", completed: false }]),
    );

    render(<MemoModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("消したくないタスク")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Notionから読込" }));
    await userEvent.click(screen.getByRole("button", { name: "読み込む" }));

    await waitFor(() => {
      expect(mockedLoadTasksFromNotion).toHaveBeenCalledWith("Test Folder");
    });

    expect(screen.getByText("消したくないタスク")).toBeInTheDocument();
    expect(
      screen.getByText("Notion 側に App TODO がまだ無いため、現在の TODO をそのまま残しました。"),
    ).toBeInTheDocument();
  });

  it("TODO 更新時に直前の localStorage 下書きを履歴へ残す", async () => {
    mockedFindTodoFileInFolder.mockResolvedValue(null);
    localStorage.setItem(
      "userMemo_folder-1",
      JSON.stringify([{ id: "task-1", text: "履歴に残るタスク", completed: false }]),
    );

    render(<MemoModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("履歴に残るタスク")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("新しいTODO"), "新しいタスク");
    await userEvent.click(screen.getByRole("button", { name: "追加" }));

    const history = JSON.parse(localStorage.getItem("userMemoHistory_folder-1") ?? "[]");
    expect(history).toHaveLength(1);
    expect(history[0].tasks).toEqual([
      { id: "task-1", text: "履歴に残るタスク", completed: false },
    ]);
  });

  it("TODO 履歴から復元できる", async () => {
    mockedFindTodoFileInFolder.mockResolvedValue(null);
    localStorage.setItem(
      "userMemo_folder-1",
      JSON.stringify([{ id: "task-current", text: "今のタスク", completed: false }]),
    );
    localStorage.setItem(
      "userMemoHistory_folder-1",
      JSON.stringify([
        {
          savedAt: 1781352305881,
          tasks: [{ id: "task-old", text: "戻したいタスク", completed: false }],
        },
      ]),
    );

    render(<MemoModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("今のタスク")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "履歴" }));
    await userEvent.click(screen.getByRole("button", { name: "復元" }));

    await waitFor(() => {
      expect(screen.getByText("戻したいタスク")).toBeInTheDocument();
    });

    expect(JSON.parse(localStorage.getItem("userMemo_folder-1") ?? "[]")).toEqual([
      { id: "task-old", text: "戻したいタスク", completed: false },
    ]);
  });
});
