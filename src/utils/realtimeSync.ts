import { type FolderOption, type Task } from "../types";

type FolderOptionsSyncMessage = {
  type: "folder-options";
  folderOptions: FolderOption[];
};

type MemoTasksSyncMessage = {
  type: "memo-tasks";
  folderId: string;
  tasks: Task[];
};

export type RealtimeSyncPayload = FolderOptionsSyncMessage | MemoTasksSyncMessage;

export type RealtimeSyncMessage = RealtimeSyncPayload & {
  sourceId: string;
  timestamp: number;
};

type RealtimeSyncListener = (message: RealtimeSyncMessage) => void;

const CHANNEL_NAME = "gd-player-realtime-sync";
const STORAGE_EVENT_KEY = "gd-player:realtime-sync";
const syncWebSocketUrl = import.meta.env.VITE_SYNC_WEBSOCKET_URL?.trim() ?? "";

const sourceId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const listeners = new Set<RealtimeSyncListener>();

let started = false;
let broadcastChannel: BroadcastChannel | null = null;
let socket: WebSocket | null = null;
const pendingSocketMessages: RealtimeSyncMessage[] = [];

const isTask = (value: unknown): value is Task => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const task = value as Partial<Task>;
  return (
    typeof task.id === "string" &&
    typeof task.text === "string" &&
    typeof task.completed === "boolean"
  );
};

const isFolderOption = (value: unknown): value is FolderOption => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const folder = value as Partial<FolderOption>;
  return typeof folder.id === "string" && typeof folder.name === "string";
};

const isRealtimeSyncMessage = (value: unknown): value is RealtimeSyncMessage => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Partial<RealtimeSyncMessage>;
  if (typeof message.sourceId !== "string" || typeof message.timestamp !== "number") {
    return false;
  }

  if (message.type === "folder-options") {
    return Array.isArray(message.folderOptions) && message.folderOptions.every(isFolderOption);
  }

  if (message.type === "memo-tasks") {
    return (
      typeof message.folderId === "string" &&
      Array.isArray(message.tasks) &&
      message.tasks.every(isTask)
    );
  }

  return false;
};

const parseMessage = (data: unknown) => {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }

  return data;
};

const notifyListeners = (message: RealtimeSyncMessage) => {
  if (message.sourceId === sourceId) {
    return;
  }

  listeners.forEach((listener) => listener(message));
};

const sendSocketMessage = (message: RealtimeSyncMessage) => {
  if (!socket) {
    return;
  }

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return;
  }

  pendingSocketMessages.push(message);
};

const flushSocketMessages = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  while (pendingSocketMessages.length > 0) {
    const message = pendingSocketMessages.shift();
    if (message) {
      socket.send(JSON.stringify(message));
    }
  }
};

const startRealtimeSync = () => {
  if (started || typeof window === "undefined") {
    return;
  }

  started = true;

  if ("BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event: MessageEvent) => {
      const message = parseMessage(event.data);
      if (isRealtimeSyncMessage(message)) {
        notifyListeners(message);
      }
    };
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) {
      return;
    }

    const message = parseMessage(event.newValue);
    if (isRealtimeSyncMessage(message)) {
      notifyListeners(message);
    }
  });

  if (syncWebSocketUrl) {
    socket = new WebSocket(syncWebSocketUrl);
    socket.addEventListener("open", flushSocketMessages);
    socket.addEventListener("message", (event) => {
      const message = parseMessage(event.data);
      if (isRealtimeSyncMessage(message)) {
        notifyListeners(message);
      }
    });
    socket.addEventListener("close", () => {
      socket = null;
    });
  }
};

export const publishRealtimeSync = (payload: RealtimeSyncPayload) => {
  startRealtimeSync();

  const message: RealtimeSyncMessage = {
    ...payload,
    sourceId,
    timestamp: Date.now(),
  };

  broadcastChannel?.postMessage(message);
  sendSocketMessage(message);

  try {
    localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(message));
  } catch (error) {
    console.error("Failed to publish realtime sync message to localStorage", error);
  }
};

export const subscribeRealtimeSync = (listener: RealtimeSyncListener) => {
  startRealtimeSync();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
