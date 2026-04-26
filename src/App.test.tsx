import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { GOOGLE_TOKEN_SCOPE_VERSION, LOCAL_STORAGE_KEYS } from "./constants";
import type { DriveFile } from "./types";

vi.mock("axios");
vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: () => vi.fn(),
}));

const mockedAxios = vi.mocked(axios);
type AxiosGetMock = {
  mockImplementation: (
    implementation: (url: string, config?: AxiosRequestConfig) => Promise<{ data: unknown }>,
  ) => void;
};

const folderOneTrack: DriveFile = {
  id: "track-1",
  name: "Folder One Song.mp3",
  mimeType: "audio/mpeg",
  modifiedTime: "2026-04-21T00:00:00.000Z",
  parents: ["folder-one"],
};

const folderTwoTrack: DriveFile = {
  id: "track-2",
  name: "Folder Two Song.mp3",
  mimeType: "audio/mpeg",
  modifiedTime: "2026-04-20T00:00:00.000Z",
  parents: ["folder-two"],
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(LOCAL_STORAGE_KEYS.GOOGLE_ACCESS_TOKEN, "test-token");
    localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN_EXPIRY, String(Date.now() + 60_000));
    localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN_SCOPE_VERSION, GOOGLE_TOKEN_SCOPE_VERSION);
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.FOLDER_OPTIONS,
      JSON.stringify([
        { id: "all", name: "All Folders" },
        { id: "folder-one", name: "Folder One" },
        { id: "folder-two", name: "Folder Two" },
      ]),
    );

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:audio-url");
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  it("再生中にフォルダのプルダウンを変更しても音楽を停止しない", async () => {
    (mockedAxios.get as unknown as AxiosGetMock).mockImplementation(async (url, config) => {
      if (String(url).includes("alt=media")) {
        return { data: new Blob(["audio"]) };
      }

      const q = String(config?.params?.q ?? "");
      if (q.includes("'folder-one'")) {
        return { data: { files: [folderOneTrack] } };
      }
      if (q.includes("'folder-two'")) {
        return { data: { files: [folderTwoTrack] } };
      }
      return { data: { files: [] } };
    });

    const user = userEvent.setup();
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause");

    render(<App />);

    await user.click(await screen.findByText("Folder One Song.mp3"));
    await waitFor(() => {
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("combobox", { name: "フォルダを選択" }));
    await user.click(await screen.findByRole("option", { name: "Folder Two" }));

    await waitFor(() => {
      expect(screen.getByText("Folder Two Song.mp3")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Folder One Song.mp3").length).toBeGreaterThan(0);
    expect(pauseSpy).not.toHaveBeenCalled();
  });
});
