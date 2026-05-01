import { NOTION_SYNC_SECTION_PREFIX } from "../constants";
import { createTask, sortTasks } from "./tasks";
import type { Task } from "../types";

interface NotionTodoResponse {
  found?: boolean;
  tasks?: Array<Pick<Task, "text" | "completed">>;
  error?: string;
}

const rawNotionSyncPageId = import.meta.env.VITE_NOTION_SYNC_PAGE_ID?.trim() ?? "";

export const normalizeNotionPageId = (value: string) => {
  const trimmedValue = value.trim();
  const compactId = trimmedValue.match(/[0-9a-fA-F]{32}/)?.[0];
  if (compactId) {
    return compactId;
  }

  const uuid = trimmedValue.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  )?.[0];
  return uuid ? uuid.replace(/-/g, "") : trimmedValue;
};

const notionSyncPageId = normalizeNotionPageId(rawNotionSyncPageId);

const getSectionPrefix = () => {
  return import.meta.env.VITE_NOTION_SYNC_SECTION_PREFIX?.trim() || NOTION_SYNC_SECTION_PREFIX;
};

const parseResponse = async (response: Response) => {
  const data = (await response.json()) as NotionTodoResponse;

  if (!response.ok) {
    throw new Error(data.error || "Notion sync request failed");
  }

  return data;
};

export const isNotionSyncConfigured = () => notionSyncPageId !== "";

export const buildNotionSyncSectionTitle = (_folderName: string) => {
  return getSectionPrefix();
};

export const loadTasksFromNotion = async (folderName: string) => {
  if (!isNotionSyncConfigured()) {
    throw new Error("Notion sync is not configured");
  }

  const params = new URLSearchParams({
    pageId: notionSyncPageId,
    folderName,
    sectionTitle: buildNotionSyncSectionTitle(folderName),
  });

  let response: Response;
  try {
    response = await fetch(`/api/notion/todo?${params.toString()}`);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Notion sync request could not be sent: ${error.message}`
        : "Notion sync request could not be sent",
    );
  }
  const data = await parseResponse(response);

  return {
    found: Boolean(data.found),
    tasks: sortTasks((data.tasks ?? []).map((task) => createTask(task.text, task.completed))),
  };
};

export const saveTasksToNotion = async (folderName: string, tasks: Task[]) => {
  if (!isNotionSyncConfigured()) {
    throw new Error("Notion sync is not configured");
  }

  let response: Response;
  try {
    response = await fetch("/api/notion/todo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageId: notionSyncPageId,
        folderName,
        sectionTitle: buildNotionSyncSectionTitle(folderName),
        tasks: tasks.map((task) => ({
          text: task.text,
          completed: task.completed,
        })),
      }),
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Notion sync request could not be sent: ${error.message}`
        : "Notion sync request could not be sent",
    );
  }

  await parseResponse(response);
};
