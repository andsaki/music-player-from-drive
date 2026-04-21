const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface JsonResponse<T> {
  status: number;
  body: T;
}

interface NotionRichTextItem {
  plain_text?: string;
}

interface NotionTodoTask {
  text: string;
  completed: boolean;
}

interface NotionBlock {
  id: string;
  type: string;
  toggle?: {
    rich_text?: NotionRichTextItem[];
  };
  to_do?: {
    rich_text?: NotionRichTextItem[];
    checked?: boolean;
  };
}

interface NotionListResponse {
  results?: NotionBlock[];
  has_more?: boolean;
  next_cursor?: string;
}

interface NotionSuccessBody {
  found?: boolean;
  tasks?: NotionTodoTask[];
  updated?: boolean;
  created?: boolean;
}

interface NotionErrorBody {
  error: string;
}

interface CreateNotionTodoResponseParams {
  method: string;
  searchParams: URLSearchParams;
  body?: {
    pageId?: string;
    sectionTitle?: string;
    tasks?: Array<Partial<NotionTodoTask>>;
  };
  env?: Record<string, string | undefined>;
}

const jsonResponse = <T>(status: number, body: T): JsonResponse<T> => ({ status, body });

const getPlainText = (richText: NotionRichTextItem[] = []) => {
  return richText.map((item) => item.plain_text ?? "").join("").trim();
};

const createRichText = (content: string) => [{ type: "text", text: { content } }];

const createTodoBlock = (task: NotionTodoTask) => ({
  object: "block",
  type: "to_do",
  to_do: {
    rich_text: createRichText(task.text),
    checked: task.completed,
    color: "default",
  },
});

const isSectionBlock = (block: NotionBlock, sectionTitle: string) => {
  return block.type === "toggle" && getPlainText(block.toggle?.rich_text) === sectionTitle;
};

const notionRequest = async <T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T | null> => {
  const response = await fetch(`${NOTION_API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as T;
};

const listBlockChildren = async (blockId: string, token: string) => {
  const results: NotionBlock[] = [];
  let nextCursor: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (nextCursor) {
      params.set("start_cursor", nextCursor);
    }

    const response = await notionRequest<NotionListResponse>(`/blocks/${blockId}/children?${params.toString()}`, token);
    results.push(...(response?.results ?? []));
    nextCursor = response?.has_more ? response.next_cursor : undefined;
  } while (nextCursor);

  return results;
};

const archiveBlocks = async (blocks: NotionBlock[], token: string) => {
  await Promise.all(
    blocks.map((block) => notionRequest(`/blocks/${block.id}`, token, { method: "PATCH", body: { archived: true } })),
  );
};

const appendChildren = async (blockId: string, children: unknown[], token: string) => {
  if (children.length === 0) {
    return;
  }

  for (let index = 0; index < children.length; index += 100) {
    await notionRequest(`/blocks/${blockId}/children`, token, {
      method: "PATCH",
      body: { children: children.slice(index, index + 100) },
    });
  }
};

const normalizeTasks = (tasks: Array<Partial<NotionTodoTask>>) => {
  return tasks
    .filter((task): task is Partial<NotionTodoTask> & { text: string } => typeof task?.text === "string")
    .map((task) => ({
      text: task.text.trim(),
      completed: Boolean(task.completed),
    }))
    .filter((task) => task.text !== "");
};

const loadSectionTasks = async (pageId: string, sectionTitle: string, token: string) => {
  const pageChildren = await listBlockChildren(pageId, token);
  const sectionBlock = pageChildren.find((block) => isSectionBlock(block, sectionTitle));

  if (!sectionBlock) {
    return { found: false, tasks: [] as NotionTodoTask[] };
  }

  const sectionChildren = await listBlockChildren(sectionBlock.id, token);
  const tasks = sectionChildren
    .filter((block) => block.type === "to_do")
    .map((block) => ({
      text: getPlainText(block.to_do?.rich_text),
      completed: Boolean(block.to_do?.checked),
    }))
    .filter((task) => task.text !== "");

  return { found: true, tasks };
};

const saveSectionTasks = async (
  pageId: string,
  sectionTitle: string,
  tasks: Array<Partial<NotionTodoTask>>,
  token: string,
) => {
  const normalizedTasks = normalizeTasks(tasks);
  const pageChildren = await listBlockChildren(pageId, token);
  const sectionBlock = pageChildren.find((block) => isSectionBlock(block, sectionTitle));

  if (!sectionBlock) {
    await appendChildren(
      pageId,
      [
        {
          object: "block",
          type: "toggle",
          toggle: {
            rich_text: createRichText(sectionTitle),
            color: "default",
            children: normalizedTasks.map(createTodoBlock),
          },
        },
      ],
      token,
    );

    return { updated: true, created: true };
  }

  const sectionChildren = await listBlockChildren(sectionBlock.id, token);
  await archiveBlocks(sectionChildren, token);
  await appendChildren(sectionBlock.id, normalizedTasks.map(createTodoBlock), token);

  return { updated: true, created: false };
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Notion sync error";
};

export const createNotionTodoResponse = async ({
  method,
  searchParams,
  body,
  env = process.env,
}: CreateNotionTodoResponseParams): Promise<JsonResponse<NotionSuccessBody | NotionErrorBody>> => {
  const token = env.NOTION_API_KEY;

  if (!token) {
    return jsonResponse(500, { error: "NOTION_API_KEY is not configured" });
  }

  const pageId = (method === "GET" ? searchParams.get("pageId") : body?.pageId)?.trim();
  const sectionTitle = (method === "GET" ? searchParams.get("sectionTitle") : body?.sectionTitle)?.trim();

  if (!pageId || !sectionTitle) {
    return jsonResponse(400, { error: "pageId and sectionTitle are required" });
  }

  try {
    if (method === "GET") {
      const result = await loadSectionTasks(pageId, sectionTitle, token);
      return jsonResponse(200, result);
    }

    if (method === "POST") {
      const result = await saveSectionTasks(pageId, sectionTitle, body?.tasks ?? [], token);
      return jsonResponse(200, result);
    }

    return jsonResponse(405, { error: "Method not allowed" });
  } catch (error) {
    return jsonResponse(500, { error: getErrorMessage(error) });
  }
};
