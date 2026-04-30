import { createNotionTodoResponse } from "./handler.js";

interface VercelRequestLike {
  url?: string;
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  const url = new URL(req.url ?? "/api/notion/todo", "http://localhost");
  const body = typeof req.body === "string" ? (JSON.parse(req.body || "{}") as Record<string, unknown>) : (req.body as Record<string, unknown> | undefined);

  const response = await createNotionTodoResponse({
    method: req.method ?? "GET",
    searchParams: url.searchParams,
    body,
  });

  res.status(response.status).json(response.body);
}
