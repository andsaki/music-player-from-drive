import { describe, expect, it } from "vitest";
import {
  addUniqueTasks,
  createTask,
  DTM_TASK_TEMPLATE,
  parseTasksFromText,
  tasksToMarkdown,
} from "./tasks";

describe("tasks utilities", () => {
  it("serializes tasks to markdown checklist", () => {
    const markdown = tasksToMarkdown("夜が落ちたら", [
      createTask("サビのリードを差し替える"),
      createTask("仮ミックスを書き出す", true),
    ]);

    expect(markdown).toContain("# 制作TODO: 夜が落ちたら");
    expect(markdown).toContain("- [ ] サビのリードを差し替える");
    expect(markdown).toContain("- [x] 仮ミックスを書き出す");
  });

  it("parses markdown checklist and plain bullet lines", () => {
    const tasks = parseTasksFromText(`
# 制作TODO: test
- [ ] キックとベースを整理する
- [x] 2mix を書き出す
- 次回やることをメモする
    `);

    expect(tasks).toHaveLength(3);
    expect(tasks[0].text).toBe("キックとベースを整理する");
    expect(tasks[0].completed).toBe(false);
    expect(tasks[1].text).toBe("次回やることをメモする");
    expect(tasks[1].completed).toBe(false);
    expect(tasks[2].text).toBe("2mix を書き出す");
    expect(tasks[2].completed).toBe(true);
  });

  it("adds template tasks without duplicates", () => {
    const currentTasks = [createTask(DTM_TASK_TEMPLATE[0])];
    const mergedTasks = addUniqueTasks(currentTasks, DTM_TASK_TEMPLATE);

    expect(mergedTasks).toHaveLength(DTM_TASK_TEMPLATE.length);
    expect(mergedTasks.filter((task) => task.text === DTM_TASK_TEMPLATE[0])).toHaveLength(1);
  });
});

