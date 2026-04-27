import React, { useCallback, useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";
import DeleteIcon from "@mui/icons-material/Delete";
import { TODO_FILE_NAME, LOCAL_STORAGE_KEYS } from "../constants";
import { type MemoModalProps, type Task } from "../types";
import {
  createTask,
  parseTasksFromText,
  sortTasks,
  tasksToMarkdown,
} from "../utils/tasks";
import {
  createTodoFile,
  findTodoFileInFolder,
  readTodoFile,
  updateTodoFile,
} from "../utils/driveTodo";
import {
  isNotionSyncConfigured,
  loadTasksFromNotion,
  saveTasksToNotion,
} from "../utils/notionTodo";
import { GoogleApiError } from "../utils/googleApi";

const isAuthorizationError = (error: unknown) => {
  if (error instanceof GoogleApiError) {
    return error.status === 401 || error.status === 403;
  }

  if (error instanceof Error) {
    return error.message.includes("401") || error.message.includes("403");
  }

  return false;
};

const getMemoStorageKey = (folderId: string) => `${LOCAL_STORAGE_KEYS.USER_MEMO_PREFIX}${folderId}`;

const memoSnackbarSx = {
  top: "calc(64px + env(safe-area-inset-top)) !important",
  zIndex: 1400,
};

const getMemoToastSx = (mode: "success" | "error") => ({
  width: "100%",
  minWidth: { xs: "min(92vw, 320px)", sm: "360px" },
  alignItems: "center",
  borderRadius: "14px",
  border: mode === "success" ? "2px solid #00f5d4" : "2px solid #ff006e",
  background:
    mode === "success"
      ? "linear-gradient(135deg, rgba(0, 245, 212, 0.92), rgba(0, 180, 216, 0.92))"
      : "linear-gradient(135deg, rgba(255, 0, 110, 0.95), rgba(255, 77, 159, 0.95))",
  backdropFilter: "blur(12px)",
  boxShadow:
    mode === "success"
      ? "0 0 30px rgba(0, 245, 212, 0.45), 0 8px 32px rgba(0, 0, 0, 0.35)"
      : "0 0 30px rgba(255, 0, 110, 0.55), 0 8px 32px rgba(0, 0, 0, 0.4)",
  color: "#fff",
  fontWeight: 700,
  letterSpacing: "0.01em",
  textShadow: "0 2px 10px rgba(0, 0, 0, 0.28)",
  "& .MuiAlert-message": {
    width: "100%",
    py: 0.25,
  },
  "& .MuiAlert-icon": {
    color: "#fbf8cc",
    opacity: 1,
  },
  "& .MuiAlert-action": {
    pt: 0.5,
  },
  "& .MuiIconButton-root": {
    color: "#fff",
    transition: "all 0.25s ease",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.12)",
      transform: "scale(1.08)",
    },
  },
});

const MemoModal: React.FC<MemoModalProps> = ({
  open,
  onClose,
  folderId,
  folderName,
  accessToken,
  onAuthError,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [todoFileId, setTodoFileId] = useState<string | null>(null);
  const [isLoadingTodo, setIsLoadingTodo] = useState(false);
  const [isSavingTodo, setIsSavingTodo] = useState(false);
  const [isSyncingNotion, setIsSyncingNotion] = useState(false);
  const notionSyncEnabled = isNotionSyncConfigured();

  const cacheTasksLocally = useCallback((currentTasks: Task[]) => {
    if (!folderId || folderId === "all") {
      return;
    }

    localStorage.setItem(getMemoStorageKey(folderId), JSON.stringify(currentTasks));
  }, [folderId]);

  const loadTasksFromLocalCache = useCallback(() => {
    if (!folderId || folderId === "all") {
      return [];
    }

    const savedTasks = localStorage.getItem(getMemoStorageKey(folderId));
    if (!savedTasks) {
      return [];
    }

    try {
      return sortTasks(JSON.parse(savedTasks) as Task[]);
    } catch (error) {
      console.error("Failed to parse tasks from localStorage", error);
      return [];
    }
  }, [folderId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFeedbackMessage(null);
    setErrorMessage(null);

    if (folderId === "all") {
      setTasks([]);
      setTodoFileId(null);
      return;
    }

    if (!accessToken) {
      setTasks(loadTasksFromLocalCache());
      setTodoFileId(null);
      setErrorMessage(
        notionSyncEnabled
          ? "Drive と同期するには再ログインが必要です。Notion 同期は引き続き使えます。"
          : "Drive と同期するには再ログインが必要です。",
      );
      return;
    }

    const loadTodo = async () => {
      setIsLoadingTodo(true);
      try {
        const todoFile = await findTodoFileInFolder(accessToken, folderId);

        if (!todoFile) {
          const cachedTasks = loadTasksFromLocalCache();
          setTasks(cachedTasks);
          setTodoFileId(null);
          setFeedbackMessage(
            cachedTasks.length > 0
              ? `このフォルダには ${TODO_FILE_NAME} がまだありません。端末内の下書きを表示しています。保存すると新規作成します。`
              : `このフォルダには ${TODO_FILE_NAME} がまだありません。保存すると新規作成します。`,
          );
          return;
        }

        const content = await readTodoFile(accessToken, todoFile.id);
        const loadedTasks = parseTasksFromText(content);

        setTasks(loadedTasks);
        setTodoFileId(todoFile.id);
        cacheTasksLocally(loadedTasks);
        setFeedbackMessage(`${TODO_FILE_NAME} を Drive から読み込みました。`);
      } catch (error) {
        console.error("Failed to load TODO from Drive", error);

        if (isAuthorizationError(error)) {
          onAuthError();
          setErrorMessage("Drive の認証が切れました。再ログインしてください。");
          return;
        }

        const cachedTasks = loadTasksFromLocalCache();
        setTasks(cachedTasks);
        setErrorMessage("Drive から TODO を読み込めなかったため、端末内の下書きを表示しています。");
      } finally {
        setIsLoadingTodo(false);
      }
    };

    void loadTodo();
  }, [open, folderId, accessToken, notionSyncEnabled, onAuthError, cacheTasksLocally, loadTasksFromLocalCache]);

  const handleAddTask = () => {
    if (newTask.trim() === "") {
      return;
    }

    const newTasks = [createTask(newTask.trim()), ...tasks];
    setTasks(newTasks);
    cacheTasksLocally(newTasks);
    setNewTask("");
    setFeedbackMessage(null);
    setErrorMessage(null);
  };

  const handleToggleTask = (id: string) => {
    const newTasks = sortTasks(
      tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
    setTasks(newTasks);
    cacheTasksLocally(newTasks);
    setFeedbackMessage(null);
    setErrorMessage(null);
  };

  const handleDeleteTask = (id: string) => {
    const newTasks = tasks.filter((task) => task.id !== id);
    setTasks(newTasks);
    cacheTasksLocally(newTasks);
    setFeedbackMessage(null);
    setErrorMessage(null);
  };

  const handleReloadFromDrive = async () => {
    if (!accessToken || folderId === "all") {
      return;
    }

    setIsLoadingTodo(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const todoFile = await findTodoFileInFolder(accessToken, folderId);
      if (!todoFile) {
        const cachedTasks = loadTasksFromLocalCache();
        setTasks(cachedTasks);
        setTodoFileId(null);
        setFeedbackMessage(
          cachedTasks.length > 0
            ? `このフォルダには ${TODO_FILE_NAME} がありません。端末内の下書きを表示しています。`
            : `このフォルダには ${TODO_FILE_NAME} がありません。`,
        );
        return;
      }

      const content = await readTodoFile(accessToken, todoFile.id);
      const loadedTasks = parseTasksFromText(content);

      setTasks(loadedTasks);
      setTodoFileId(todoFile.id);
      cacheTasksLocally(loadedTasks);
      setFeedbackMessage(`${TODO_FILE_NAME} を再読み込みしました。`);
    } catch (error) {
      console.error("Failed to reload TODO from Drive", error);
      if (isAuthorizationError(error)) {
        onAuthError();
        setErrorMessage("Drive の認証が切れました。再ログインしてください。");
        return;
      }

      setErrorMessage("Drive から TODO を再読み込みできませんでした。");
    } finally {
      setIsLoadingTodo(false);
    }
  };

  const handleSaveMemo = async () => {
    if (folderId === "all") {
      setErrorMessage("TODO を使うには具体的なフォルダを選択してください。");
      return;
    }

    if (!accessToken) {
      setErrorMessage("Drive に保存するには再ログインが必要です。");
      return;
    }

    setIsSavingTodo(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const markdown = tasksToMarkdown(folderName, tasks);

      if (todoFileId) {
        await updateTodoFile(accessToken, todoFileId, markdown);
      } else {
        const createdTodoFile = await createTodoFile(accessToken, folderId, markdown);
        setTodoFileId(createdTodoFile.id);
      }

      cacheTasksLocally(tasks);
      setFeedbackMessage(`Drive の ${TODO_FILE_NAME} を保存しました。`);
      onClose();
    } catch (error) {
      console.error("Failed to save TODO to Drive", error);

      if (isAuthorizationError(error)) {
        onAuthError();
        setErrorMessage("Drive の認証が切れました。再ログインしてください。");
        return;
      }

      setErrorMessage("Drive への保存に失敗しました。通信状態を確認してください。");
    } finally {
      setIsSavingTodo(false);
    }
  };

  const handleLoadFromNotion = async () => {
    if (folderId === "all" || !notionSyncEnabled) {
      return;
    }

    setIsSyncingNotion(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const result = await loadTasksFromNotion(folderName);
      setTasks(result.tasks);
      cacheTasksLocally(result.tasks);
      setFeedbackMessage(
        result.found
          ? "Notion の App TODO Sync から読み込みました。"
          : "Notion 側に App TODO Sync がまだ無いため、空の TODO を表示しています。",
      );
    } catch (error) {
      console.error("Failed to load TODO from Notion", error);
      setErrorMessage(error instanceof Error ? error.message : "Notion から TODO を読み込めませんでした。");
    } finally {
      setIsSyncingNotion(false);
    }
  };

  const handleSaveToNotion = async () => {
    if (folderId === "all" || !notionSyncEnabled) {
      return;
    }

    setIsSyncingNotion(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      await saveTasksToNotion(folderName, tasks);
      cacheTasksLocally(tasks);
      setFeedbackMessage("Notion の App TODO Sync に保存しました。");
    } catch (error) {
      console.error("Failed to save TODO to Notion", error);
      setErrorMessage(error instanceof Error ? error.message : "Notion への保存に失敗しました。");
    } finally {
      setIsSyncingNotion(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleFeedbackClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }

    setFeedbackMessage(null);
  };

  const handleErrorClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }

    setErrorMessage(null);
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" disableEnforceFocus>
        <DialogTitle>Tasks for Folder: {folderName}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mb: 2, mt: 1 }}>
            {folderId === "all" && (
              <Alert severity="warning">TODO を使うには「All Folders」以外の曲フォルダを選択してください。</Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button onClick={handleReloadFromDrive} variant="outlined" disabled={folderId === "all" || isLoadingTodo || isSavingTodo || isSyncingNotion || !accessToken}>
                Driveから再読込
              </Button>
              <Button onClick={handleLoadFromNotion} variant="outlined" disabled={folderId === "all" || isLoadingTodo || isSavingTodo || isSyncingNotion || !notionSyncEnabled}>
                {isSyncingNotion ? "Notion同期中..." : "Notionから読込"}
              </Button>
              <Button onClick={handleSaveToNotion} variant="outlined" disabled={folderId === "all" || isLoadingTodo || isSavingTodo || isSyncingNotion || !notionSyncEnabled}>
                {isSyncingNotion ? "Notion同期中..." : "Notionへ保存"}
              </Button>
            </Stack>
          </Stack>
          {isLoadingTodo ? (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <CircularProgress size={24} />
              <span>Drive から TODO を読み込み中...</span>
            </Stack>
          ) : (
            <>
              <TextField
                autoFocus
                margin="dense"
                label="Add a new task"
                type="text"
                fullWidth
                variant="outlined"
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="例: サビのリードを差し替える / 低域を整理する"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleAddTask();
                  }
                }}
                disabled={folderId === "all" || isSyncingNotion}
              />
              <Button onClick={handleAddTask} variant="contained" sx={{ mt: 2, mb: 2 }} disabled={folderId === "all" || isSyncingNotion}>
                Add Task
              </Button>
              <Divider />
              <List>
                <AnimatePresence>
                  {tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ListItem
                        sx={{ my: 2 }}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeleteTask(task.id)}
                            sx={{ p: 0 }}
                            disabled={folderId === "all" || isSyncingNotion}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                        disablePadding
                      >
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={task.completed}
                            tabIndex={-1}
                            disableRipple
                            onChange={() => handleToggleTask(task.id)}
                            disabled={folderId === "all" || isSyncingNotion}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={task.text}
                          sx={{
                            textDecoration: task.completed ? "line-through" : "none",
                            mr: 5,
                          }}
                        />
                      </ListItem>
                      {index < tasks.length - 1 && <Divider />}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isSavingTodo || isSyncingNotion}>Cancel</Button>
          <Button onClick={handleSaveMemo} variant="contained" disabled={folderId === "all" || isLoadingTodo || isSavingTodo || isSyncingNotion}>
            {isSavingTodo ? "Driveに保存中..." : "Driveに保存"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={feedbackMessage !== null}
        autoHideDuration={4000}
        onClose={handleFeedbackClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={memoSnackbarSx}
      >
        <Alert onClose={handleFeedbackClose} severity="success" variant="filled" sx={getMemoToastSx("success")}>
          {feedbackMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={errorMessage !== null}
        autoHideDuration={5000}
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={memoSnackbarSx}
      >
        <Alert onClose={handleErrorClose} severity="error" variant="filled" sx={getMemoToastSx("error")}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MemoModal;
