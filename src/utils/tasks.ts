import { type Task } from "../types";

const createTaskId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createTask = (text: string, completed = false): Task => ({
  id: createTaskId(),
  text,
  completed,
});

export const sortTasks = (tasks: Task[]) => {
  return [...tasks].sort((firstTask, secondTask) => {
    return Number(firstTask.completed) - Number(secondTask.completed);
  });
};

export const DTM_TASK_TEMPLATE = [
  "リファレンスを聴いて今日のゴールを決める",
  "アレンジの違和感を3点まで洗い出す",
  "主役トラックの音量バランスを整える",
  "低域とキックの住み分けを確認する",
  "メインボーカル / 主旋律の聴こえ方を確認する",
  "書き出し用の仮ミックスを作る",
  "次回やることをメモして終了する",
];

export const addUniqueTasks = (currentTasks: Task[], taskTexts: string[]) => {
  const existingTexts = new Set(currentTasks.map((task) => task.text));
  const additionalTasks = taskTexts
    .map((taskText) => taskText.trim())
    .filter((taskText) => taskText !== "" && !existingTexts.has(taskText))
    .map((taskText) => createTask(taskText));

  return [...additionalTasks, ...currentTasks];
};

export const tasksToMarkdown = (folderName: string, tasks: Task[]) => {
  const title = folderName ? `# 制作TODO: ${folderName}` : "# 制作TODO";
  const lines = sortTasks(tasks).map((task) => {
    return `- [${task.completed ? "x" : " "}] ${task.text}`;
  });

  return [title, "", ...lines].join("\n");
};

export const parseTasksFromText = (content: string) => {
  const parsedTasks = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => {
      const checklistMatch = line.match(/^[-*]\s+\[( |x|X)\]\s+(.+)$/);

      if (checklistMatch) {
        return createTask(checklistMatch[2].trim(), checklistMatch[1].toLowerCase() === "x");
      }

      const bulletMatch = line.match(/^[-*]\s+(.+)$/);
      if (bulletMatch) {
        return createTask(bulletMatch[1].trim());
      }

      return createTask(line);
    });

  return sortTasks(parsedTasks);
};

