import { buildNotionSyncSectionTitle } from "./notionTodo";

describe("notionTodo utilities", () => {
  it("uses a stable app-managed toggle title", () => {
    expect(buildNotionSyncSectionTitle(" 夜が   落ちたら Project ")).toBe("App TODO");
  });

  it("does not include the folder name in the toggle title", () => {
    expect(buildNotionSyncSectionTitle("   ")).toBe("App TODO");
  });
});
