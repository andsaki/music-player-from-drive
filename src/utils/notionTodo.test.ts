import { buildNotionSyncSectionTitle, normalizeNotionPageId } from "./notionTodo";

describe("notionTodo utilities", () => {
  it("uses a stable app-managed toggle title", () => {
    expect(buildNotionSyncSectionTitle(" 夜が   落ちたら Project ")).toBe("App TODO");
  });

  it("does not include the folder name in the toggle title", () => {
    expect(buildNotionSyncSectionTitle("   ")).toBe("App TODO");
  });

  it("extracts a Notion page ID from a copied Notion URL", () => {
    expect(
      normalizeNotionPageId("https://www.notion.so/TODO-35122d999b12801c93fff4245a8531b0?source=copy_link"),
    ).toBe("35122d999b12801c93fff4245a8531b0");
  });

  it("normalizes hyphenated Notion page IDs", () => {
    expect(normalizeNotionPageId("b8265b1f-76fe-4f13-9025-c06ea102a459")).toBe(
      "b8265b1f76fe4f139025c06ea102a459",
    );
  });
});
