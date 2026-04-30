const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface JsonResponse<T> {
  status: number;
  body: T;
}

interface NotionRichTextItem {
  plain_text?: string;
}

interface NotionTitleItem {
  plain_text?: string;
}

interface NotionTodoTask {
  text: string;
  completed: boolean;
}

interface NotionBlock {
  id: string;
  type: string;
  child_page?: {
    title?: string;
  };
  heading_1?: {
    rich_text?: NotionRichTextItem[];
  };
  heading_2?: {
    rich_text?: NotionRichTextItem[];
  };
  heading_3?: {
    rich_text?: NotionRichTextItem[];
  };
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

interface NotionPageResponse {
  id: string;
  properties?: Record<
    string,
    {
      type?: string;
      title?: NotionTitleItem[];
    }
  >;
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
    folderName?: string;
    tasks?: Array<Partial<NotionTodoTask>>;
  };
  env?: Record<string, string | undefined>;
}

const jsonResponse = <T>(status: number, body: T): JsonResponse<T> => ({ status, body });

const normalizeNotionPageId = (value: string) => {
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

const isNotionPageId = (value: string) => /^[0-9a-fA-F]{32}$/.test(value);

const getPlainText = (richText: NotionRichTextItem[] = []) => {
  return richText
    .map((item) => item.plain_text ?? "")
    .join("")
    .trim();
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

const createHeadingBlock = (content: string) => ({
  object: "block",
  type: "heading_1",
  heading_1: {
    rich_text: createRichText(content),
    color: "default",
  },
});

const createToggleBlock = (title: string, tasks: NotionTodoTask[]) => ({
  object: "block",
  type: "toggle",
  toggle: {
    rich_text: createRichText(title),
    color: "default",
    children: tasks.map(createTodoBlock),
  },
});

const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, " ").toLowerCase();

const getHeadingText = (block: NotionBlock) => {
  if (block.type === "heading_1") return getPlainText(block.heading_1?.rich_text);
  if (block.type === "heading_2") return getPlainText(block.heading_2?.rich_text);
  if (block.type === "heading_3") return getPlainText(block.heading_3?.rich_text);
  return "";
};

const getHeadingLevel = (block: NotionBlock) => {
  if (block.type === "heading_1") return 1;
  if (block.type === "heading_2") return 2;
  if (block.type === "heading_3") return 3;
  return null;
};

const isTodoHeading = (block: NotionBlock) => {
  const headingText = normalizeTitle(getHeadingText(block));
  return headingText === "todo" || headingText === "todos";
};

const isAppTodoToggle = (block: NotionBlock, title: string) => {
  return (
    block.type === "toggle" &&
    normalizeTitle(getPlainText(block.toggle?.rich_text)) === normalizeTitle(title)
  );
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

    const response = await notionRequest<NotionListResponse>(
      `/blocks/${blockId}/children?${params.toString()}`,
      token,
    );
    results.push(...(response?.results ?? []));
    nextCursor = response?.has_more ? response.next_cursor : undefined;
  } while (nextCursor);

  return results;
};

const archiveBlocks = async (blocks: NotionBlock[], token: string) => {
  await Promise.all(
    blocks.map((block) =>
      notionRequest(`/blocks/${block.id}`, token, { method: "PATCH", body: { archived: true } }),
    ),
  );
};

const appendChildren = async (
  blockId: string,
  children: unknown[],
  token: string,
  after?: string,
) => {
  if (children.length === 0) {
    return;
  }

  for (let index = 0; index < children.length; index += 100) {
    await notionRequest(`/blocks/${blockId}/children`, token, {
      method: "PATCH",
      body: {
        children: children.slice(index, index + 100),
        ...(index === 0 && after ? { after } : {}),
      },
    });
  }
};

const normalizeTasks = (tasks: Array<Partial<NotionTodoTask>>) => {
  return tasks
    .filter(
      (task): task is Partial<NotionTodoTask> & { text: string } => typeof task?.text === "string",
    )
    .map((task) => ({
      text: task.text.trim(),
      completed: Boolean(task.completed),
    }))
    .filter((task) => task.text !== "");
};

const getPageTitle = async (pageId: string, token: string) => {
  const page = await notionRequest<NotionPageResponse>(`/pages/${pageId}`, token);
  const titleProperty = Object.values(page?.properties ?? {}).find(
    (property) => property.type === "title",
  );
  return getPlainText(titleProperty?.title);
};

const resolveSongPageId = async (parentPageId: string, folderName: string, token: string) => {
  const normalizedFolderName = normalizeTitle(folderName);

  if (!normalizedFolderName) {
    throw new Error("folderName is required");
  }

  const parentTitle = await getPageTitle(parentPageId, token);
  if (normalizeTitle(parentTitle) === normalizedFolderName) {
    return parentPageId;
  }

  const parentChildren = await listBlockChildren(parentPageId, token);
  const songPage = parentChildren.find((block) => {
    return (
      block.type === "child_page" &&
      normalizeTitle(block.child_page?.title ?? "") === normalizedFolderName
    );
  });

  if (!songPage) {
    throw new Error(`Notion song page was not found under the configured parent: ${folderName}`);
  }

  return songPage.id;
};

const findTodoSection = (pageChildren: NotionBlock[]) => {
  const headingIndex = pageChildren.findIndex(isTodoHeading);
  if (headingIndex === -1) {
    return { heading: null, blocks: [] as NotionBlock[] };
  }

  const heading = pageChildren[headingIndex];
  const headingLevel = getHeadingLevel(heading);
  const blocks: NotionBlock[] = [];

  for (const block of pageChildren.slice(headingIndex + 1)) {
    const nextHeadingLevel = getHeadingLevel(block);
    if (headingLevel !== null && nextHeadingLevel !== null && nextHeadingLevel <= headingLevel) {
      break;
    }
    blocks.push(block);
  }

  return { heading, blocks };
};

const loadSectionTasks = async (
  pageId: string,
  folderName: string,
  appTodoTitle: string,
  token: string,
) => {
  const songPageId = await resolveSongPageId(pageId, folderName, token);
  const pageChildren = await listBlockChildren(songPageId, token);
  const todoSection = findTodoSection(pageChildren);
  const sectionBlock = todoSection.blocks.find((block) => isAppTodoToggle(block, appTodoTitle));

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

const loadLegacySectionTasks = async (pageId: string, sectionTitle: string, token: string) => {
  const pageChildren = await listBlockChildren(pageId, token);
  const sectionBlock = pageChildren.find((block) => isAppTodoToggle(block, sectionTitle));

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
  folderName: string,
  appTodoTitle: string,
  tasks: Array<Partial<NotionTodoTask>>,
  token: string,
) => {
  const normalizedTasks = normalizeTasks(tasks);
  const songPageId = await resolveSongPageId(pageId, folderName, token);
  const pageChildren = await listBlockChildren(songPageId, token);
  const todoSection = findTodoSection(pageChildren);
  const sectionBlock = todoSection.blocks.find((block) => isAppTodoToggle(block, appTodoTitle));

  if (!sectionBlock) {
    if (todoSection.heading) {
      await appendChildren(
        songPageId,
        [createToggleBlock(appTodoTitle, normalizedTasks)],
        token,
        todoSection.heading.id,
      );
    } else {
      await appendChildren(
        songPageId,
        [createHeadingBlock("Todo"), createToggleBlock(appTodoTitle, normalizedTasks)],
        token,
      );
    }

    return { updated: true, created: true };
  }

  const sectionChildren = await listBlockChildren(sectionBlock.id, token);
  await archiveBlocks(sectionChildren, token);
  await appendChildren(sectionBlock.id, normalizedTasks.map(createTodoBlock), token);

  return { updated: true, created: false };
};

const saveLegacySectionTasks = async (
  pageId: string,
  sectionTitle: string,
  tasks: Array<Partial<NotionTodoTask>>,
  token: string,
) => {
  const normalizedTasks = normalizeTasks(tasks);
  const pageChildren = await listBlockChildren(pageId, token);
  const sectionBlock = pageChildren.find((block) => isAppTodoToggle(block, sectionTitle));

  if (!sectionBlock) {
    await appendChildren(pageId, [createToggleBlock(sectionTitle, normalizedTasks)], token);
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

  const pageId = normalizeNotionPageId(
    (method === "GET" ? searchParams.get("pageId") : body?.pageId)?.trim() ?? "",
  );
  const sectionTitle = (
    method === "GET" ? searchParams.get("sectionTitle") : body?.sectionTitle
  )?.trim();
  const folderName = (method === "GET" ? searchParams.get("folderName") : body?.folderName)?.trim();

  if (!pageId || !sectionTitle) {
    return jsonResponse(400, { error: "pageId and sectionTitle are required" });
  }

  if (!isNotionPageId(pageId)) {
    return jsonResponse(400, {
      error: "pageId must be a Notion page ID or a Notion page URL",
    });
  }

  try {
    if (method === "GET") {
      const result = folderName
        ? await loadSectionTasks(pageId, folderName, sectionTitle, token)
        : await loadLegacySectionTasks(pageId, sectionTitle, token);
      return jsonResponse(200, result);
    }

    if (method === "POST") {
      const result = folderName
        ? await saveSectionTasks(pageId, folderName, sectionTitle, body?.tasks ?? [], token)
        : await saveLegacySectionTasks(pageId, sectionTitle, body?.tasks ?? [], token);
      return jsonResponse(200, result);
    }

    return jsonResponse(405, { error: "Method not allowed" });
  } catch (error) {
    return jsonResponse(500, { error: getErrorMessage(error) });
  }
};
