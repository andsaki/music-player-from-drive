import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { type MemoModalProps } from "../types";
import { LOCAL_STORAGE_KEYS } from "../constants";

import { type Task } from "../types";

/**
 * メモモーダルコンポーネント。
 * フォルダごとにメモを保存・表示します。
 */
const MemoModal: React.FC<MemoModalProps> = ({ open, onClose, folderId, folderName }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [allLocalStorageData, setAllLocalStorageData] = useState<Record<string, string>>({});

  // folderIdとopenの状態に基づいてメモを読み込む
  useEffect(() => {
    if (open && folderId) {
      const memoKey = `${LOCAL_STORAGE_KEYS.USER_MEMO_PREFIX}${folderId}`;
      const savedTasks = localStorage.getItem(memoKey);
      if (savedTasks) {
        try {
          setTasks(JSON.parse(savedTasks));
        } catch (e) {
          console.error("Failed to parse tasks from localStorage", e);
          setTasks([]);
        }
      } else {
        setTasks([]); // フォルダにメモがない場合はクリア
      }

      // 全てのローカルストレージデータを読み込む (デバッグ用)
      const allData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allData[key] = localStorage.getItem(key) || "";
        }
      }
      setAllLocalStorageData(allData);
    }
  }, [open, folderId]);

  // タスクを保存するハンドラ
  const saveTasks = (currentTasks: Task[]) => {
    if (folderId) {
      const memoKey = `${LOCAL_STORAGE_KEYS.USER_MEMO_PREFIX}${folderId}`;
      localStorage.setItem(memoKey, JSON.stringify(currentTasks));
    }
  };

  const handleAddTask = () => {
    if (newTask.trim() !== "") {
      const newTasks = [
        ...tasks,
        { id: Date.now().toString(), text: newTask.trim(), completed: false },
      ];
      setTasks(newTasks);
      saveTasks(newTasks);
      setNewTask("");
    }
  };

  const handleToggleTask = (id: string) => {
    const newTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task,
    );
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  const handleDeleteTask = (id: string) => {
    const newTasks = tasks.filter((task) => task.id !== id);
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  // メモを保存するハンドラ
  const handleSaveMemo = () => {
    saveTasks(tasks);
    onClose();
  };

  // モーダルが閉じられたときにメモを保存する（CloseボタンでもSaveボタンでも）
  const handleClose = () => {
    saveTasks(tasks);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" disableEnforceFocus>
      <DialogTitle>Tasks for Folder: {folderName}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Add a new task"
          type="text"
          fullWidth
          variant="outlined"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleAddTask();
            }
          }}
        />
        <Button onClick={handleAddTask} variant="contained" sx={{ mt: 2, mb: 2 }}>
          Add Task
        </Button>
        <List>
          {tasks.map((task) => (
            <ListItem
              key={task.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteTask(task.id)}
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
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button onClick={handleSaveMemo}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemoModal;
