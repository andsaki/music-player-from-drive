import { buildNotionSyncSectionTitle } from "./notionTodo";

describe("notionTodo utilities", () => {
  it("builds a readable section title from folder name", () => {
    expect(buildNotionSyncSectionTitle(" 夜が   落ちたら Project ")).toBe("App TODO Sync: 夜が 落ちたら Project");
  });

  it("falls back when folder name is blank", () => {
    expect(buildNotionSyncSectionTitle("   ")).toBe("App TODO Sync: Untitled Folder");
  });
});
