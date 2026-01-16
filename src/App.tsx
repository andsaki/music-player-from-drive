import { useState, useEffect, useRef } from "react";
import {
  AppBar,
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  Container,
  List,
  ListItemText,
  Button,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  IconButton,
  ListItemButton,
} from "@mui/material";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import ShareIcon from "@mui/icons-material/Share";
import CloseIcon from "@mui/icons-material/Close";
import CloudIcon from "@mui/icons-material/Cloud";
import { useGoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import axios from "axios";
import type { SelectChangeEvent } from "@mui/material/Select";
import FolderManagement from "./components/FolderManagement.tsx";
import MemoModal from "./components/MemoModal.tsx";
import { CustomAudioPlayer } from "./components/CustomAudioPlayer.tsx";
import { type DriveFile, type FolderOption } from "./types";
import { ALL_FOLDERS_OPTION, LOCAL_STORAGE_KEYS } from "./constants";
import { generateShareLink, copyToClipboard } from "./utils";

/**
 * メインアプリケーションコンポーネント。
 * Google Driveから音楽ファイルを管理・再生する機能を提供します。
 */
function App() {
  // フィルタリングオプションとして利用するフォルダの定義
  // useStateを使用して動的に管理できるようにする
  // localStorageから初期値を読み込み、変更があればlocalStorageに保存する
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>(() => {
    const savedFolderOptions = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLDER_OPTIONS);
    if (savedFolderOptions) {
      return JSON.parse(savedFolderOptions);
    } else {
      return [ALL_FOLDERS_OPTION];
    }
  });

  // folderOptionsが変更されるたびにlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLDER_OPTIONS, JSON.stringify(folderOptions));
  }, [folderOptions]);

  // Googleアクセストークンを管理するstate。sessionStorageから初期値を読み込む。
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    sessionStorage.getItem(LOCAL_STORAGE_KEYS.GOOGLE_ACCESS_TOKEN),
  );
  // Google Driveから取得した全ての音楽ファイルを保持するstate
  const [allFetchedMusicFiles, setAllFetchedMusicFiles] = useState<DriveFile[]>([]);
  // フィルタリングされた表示用の音楽ファイルを保持するstate
  const [musicFiles, setMusicFiles] = useState<DriveFile[]>([]);
  // 現在選択されている音楽ファイルを保持するstate
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  // ファイル取得中のローディング状態を管理するstate
  const [loading, setLoading] = useState<boolean>(false);
  // 音楽再生中のローディング状態を管理するstate
  const [playingLoading, setPlayingLoading] = useState<boolean>(false);
  // 現在選択されているフィルタリングフォルダのIDを管理するstate（初期値は「全て」）
  const [currentFilterFolderId, setCurrentFilterFolderId] = useState<string>("all");
  // audio要素への参照を保持するref
  const audioRef = useRef<HTMLAudioElement>(null);
  // 再生モードを管理するstate
  const [playMode, setPlayMode] = useState<"repeat-all" | "repeat-one" | "none">("repeat-all");

  // フォルダ管理モーダルの開閉状態を管理するstate
  const [openFolderManagement, setOpenFolderManagement] = useState(false);
  const [openMemoModal, setOpenMemoModal] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // 新しいフォルダが追加されたときのハンドラ
  const handleAddFolder = (newFolder: FolderOption) => {
    setFolderOptions((prevOptions: Array<{ id: string; name: string }>) => [
      ...prevOptions,
      newFolder,
    ]);
  };

  // Googleログイン処理のフック
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("Login successful! Token response:", tokenResponse);
      setAccessToken(tokenResponse.access_token);
      sessionStorage.setItem(LOCAL_STORAGE_KEYS.GOOGLE_ACCESS_TOKEN, tokenResponse.access_token); // アクセストークンをsessionStorageに保存
    },
    onError: (errorResponse) => console.log("Login failed! Error:", errorResponse),
    scope: "https://www.googleapis.com/auth/drive.readonly", // Google Driveの読み取り専用スコープ
  });

  // ログアウト処理
  const handleLogout = () => {
    setAccessToken(null); // アクセストークンをクリア
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.GOOGLE_ACCESS_TOKEN); // sessionStorageからアクセストークンを削除
    setAllFetchedMusicFiles([]); // 全ての音楽ファイルをクリア
    setMusicFiles([]); // 表示用の音楽ファイルをクリア
    setSelectedFile(null); // 選択中のファイルをクリア
    setPlayingLoading(false); // 再生ローディング状態をリセット
    if (audioRef.current) {
      audioRef.current.pause(); // 再生中の音楽を停止
      audioRef.current.src = ""; // audioソースをクリア
    }
  };

  // フォルダフィルタリングの変更ハンドラ
  const handleFilterFolderChange = (event: SelectChangeEvent<string>) => {
    setCurrentFilterFolderId(event.target.value); // 選択されたフォルダIDを更新
    setSelectedFile(null); // 選択中のファイルをクリア
    setPlayingLoading(false); // 再生ローディング状態をリセット
    if (audioRef.current) {
      audioRef.current.pause(); // 再生中の音楽を停止
      audioRef.current.src = ""; // audioソースをクリア
    }
  };

  // 音楽ファイルをフェッチする関数
  const fetchMusicFiles = async () => {
    if (!accessToken) return;

    setLoading(true); // フェッチ開始時にローディング状態をtrueに設定
    try {
      const allFiles: DriveFile[] = [];
      // 定義された各フォルダから音楽ファイルをフェッチ（'all'オプションは除く）
      for (const folder of folderOptions.filter(
        (opt: { id: string; name: string }) => opt.id !== "all",
      )) {
        const response = await axios.get("https://www.googleapis.com/drive/v3/files", {
          headers: {
            Authorization: `Bearer ${accessToken}`, // アクセストークンをヘッダーに含める
          },
          params: {
            q: `'${folder.id}' in parents and mimeType contains 'audio/'`, // フォルダ内のオーディオファイルを検索
            fields: "files(id, name, mimeType, modifiedTime, parents)", // 取得するフィールドを指定
          },
        });
        allFiles.push(...(response.data.files || [])); // 取得したファイルをリストに追加
      }
      // 最終更新日時で降順にソート（新しいものが先頭）
      allFiles.sort(
        (a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime(),
      );

      console.log("Fetched music files:", allFiles);
      setAllFetchedMusicFiles(allFiles); // 全ての音楽ファイルをstateに保存
    } catch (error: unknown) {
      console.error("Error fetching music files:", error);
      // トークンが無効な場合、ログアウトして再ログインを促す
      if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false); // フェッチ完了後にローディング状態をfalseに設定
    }
  };

  // アクセストークンまたはフォルダオプションが変更されたときに音楽ファイルをフェッチするuseEffect
  useEffect(() => {
    console.log("Current accessToken:", accessToken);
    fetchMusicFiles();
  }, [accessToken, folderOptions]); // accessTokenまたはfolderOptionsが変更されたときにのみ実行

  // フィルタリングフォルダIDまたはフェッチされた音楽ファイルが変更されたときに、表示用の音楽ファイルをフィルタリングするuseEffect
  useEffect(() => {
    if (currentFilterFolderId === "all") {
      setMusicFiles(allFetchedMusicFiles); // 「全て」が選択されている場合は、全てのファイルをそのまま表示
    } else {
      // 選択されたフォルダIDに基づいてファイルをフィルタリング
      const filtered = allFetchedMusicFiles.filter(
        (file) => file.parents && file.parents.includes(currentFilterFolderId),
      );
      setMusicFiles(filtered); // フィルタリングされたファイルをstateに保存
    }
  }, [currentFilterFolderId, allFetchedMusicFiles]); // currentFilterFolderIdまたはallFetchedMusicFilesが変更されたときにのみ実行

  // 音楽再生処理
  const playMusic = async (file: DriveFile) => {
    setSelectedFile(file); // 選択中のファイルを更新
    setPlayingLoading(true); // オーディオフェッチ開始時に再生ローディング状態をtrueに設定
    console.log("Playing loading set to true for file:", file.name);
    try {
      const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, // Google Driveからメディアコンテンツを取得
        {
          headers: {
            Authorization: `Bearer ${accessToken}`, // アクセストークンをヘッダーに含める
          },
          responseType: "blob", // バイナリデータとしてレスポンスを受け取る
        },
      );
      const audioUrl = URL.createObjectURL(response.data); // BlobからURLを作成
      if (audioRef.current) {
        audioRef.current.src = audioUrl; // audioソースを設定
        audioRef.current.play(); // 音楽を再生
      }
    } catch (error: unknown) {
      console.error("Error playing music:", error);
    } finally {
      setPlayingLoading(false); // 再生完了後にローディング状態をfalseに設定
      console.log("Playing loading set to false for file:", file.name);
    }
  };

  const handleShareClick = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation(); // 親要素のonClickイベントが発火しないようにする
    const result = await copyToClipboard(generateShareLink(fileId));
    setSnackbarMessage(result.message);
    setSnackbarOpen(true);
  };

  // Snackbarを閉じるハンドラ
  const handleSnackbarClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleAudioEnded = () => {
    if (!selectedFile || !audioRef.current) return;

    const currentIndex = musicFiles.findIndex((file) => file.id === selectedFile.id);
    if (currentIndex === -1) return;

    if (playMode === "repeat-one") {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else if (playMode === "repeat-all") {
      const nextIndex = (currentIndex + 1) % musicFiles.length;
      playMusic(musicFiles[nextIndex]);
    }
    // 'none' の場合は何もしない
  };

  const togglePlayMode = () => {
    setPlayMode((prevMode) => {
      if (prevMode === "repeat-all") return "repeat-one";
      if (prevMode === "repeat-one") return "none";
      return "repeat-all";
    });
  };

  const handlePrevious = () => {
    if (!selectedFile || musicFiles.length === 0) return;
    const currentIndex = musicFiles.findIndex((file) => file.id === selectedFile.id);
    if (currentIndex === -1) return;
    const previousIndex = currentIndex === 0 ? musicFiles.length - 1 : currentIndex - 1;
    playMusic(musicFiles[previousIndex]);
  };

  const handleNext = () => {
    if (!selectedFile || musicFiles.length === 0) return;
    const currentIndex = musicFiles.findIndex((file) => file.id === selectedFile.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % musicFiles.length;
    playMusic(musicFiles[nextIndex]);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <CssBaseline />
      {/* アプリケーションのヘッダー部分 */}
      <AppBar position="static">
        <Toolbar sx={{ gap: 2, mt: 0, mb: 0 }}>
          <MusicNoteIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            GD-Player
          </Typography>
          {/* アクセストークンが存在する場合のみログアウトボタンを表示 */}
          {accessToken && (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* メインコンテンツエリア */}
      <Container
        component="main"
        sx={{
          mt: 0,
          mb: 2,
          flexGrow: 1,
          overflowY: "auto",
          paddingBottom: "120px",
          position: "relative",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          {/* アクセストークンが存在する場合のみフォルダフィルタリングのドロップダウンとフォルダ追加ボタンを表示 */}
          {accessToken && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                <InputLabel id="filter-folder-label">Filter Folder</InputLabel>
                <Select
                  labelId="filter-folder-label"
                  id="filter-folder-select"
                  value={currentFilterFolderId}
                  onChange={handleFilterFolderChange}
                  label="Filter Folder"
                >
                  {folderOptions.map((option: FolderOption) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {currentFilterFolderId === "all" ? (
                <Button variant="outlined" onClick={() => setOpenFolderManagement(true)}>
                  Add Folder
                </Button>
              ) : (
                <Button variant="outlined" onClick={() => setOpenMemoModal(true)}>
                  Memo
                </Button>
              )}
            </Box>
          )}
        </Box>
        {/* FolderManagement モーダルコンポーネント */}
        <FolderManagement
          open={openFolderManagement}
          onClose={() => setOpenFolderManagement(false)}
          onAddFolder={handleAddFolder}
          accessToken={accessToken} // accessTokenを渡す
        />
        {/* MemoModal コンポーネント */}
        {/* MemoModal コンポーネント */}
        <MemoModal
          open={openMemoModal}
          onClose={() => setOpenMemoModal(false)}
          folderId={currentFilterFolderId}
          folderName={
            folderOptions.find((option: FolderOption) => option.id === currentFilterFolderId)
              ?.name || ALL_FOLDERS_OPTION.name
          }
        />
        {/* アクセストークンが存在する場合の表示ロジック */}
        {accessToken ? (
          loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress /> {/* ローディング中の表示 */}
            </Box>
          ) : (
            <List>
              {musicFiles.length > 0 ? (
                musicFiles.map((file) => (
                  <ListItemButton
                    key={file.id}
                    onClick={() => playMusic(file)}
                    sx={{
                      mb: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <ListItemText primary={file.name} />
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {playingLoading && selectedFile?.id === file.id && (
                        <CircularProgress size={20} sx={{ ml: 2 }} />
                      )}
                      <IconButton
                        edge="end"
                        aria-label="share"
                        onClick={(e) => handleShareClick(e, file.id)}
                      >
                        <ShareIcon />
                      </IconButton>
                    </Box>
                  </ListItemButton>
                ))
              ) : (
                <Typography>No music files found in your Google Drive.</Typography>
              )}
            </List>
          )
        ) : (
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              textAlign: "center",
              px: 2,
            }}
          >
            {/* メインタイトル */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <CloudIcon
                sx={{
                  fontSize: 120,
                  mb: 3,
                  background: "linear-gradient(135deg, #ff006e, #00f5d4)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 20px rgba(255, 0, 110, 0.6))",
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontFamily: "Orbitron, sans-serif",
                  fontWeight: 900,
                  mb: 2,
                  background: "linear-gradient(90deg, #ff006e, #00f5d4, #fbf8cc)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4rem" },
                  textShadow: "0 0 40px rgba(255, 0, 110, 0.5)",
                }}
              >
                GD-Player
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  color: "#00f5d4",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 300,
                  fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                  letterSpacing: "0.1em",
                }}
              >
                Stream Your Music from Google Drive
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <Typography
                variant="body1"
                sx={{
                  mb: 6,
                  color: "text.secondary",
                  maxWidth: "600px",
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  lineHeight: 1.8,
                }}
              >
                Access your music library stored in Google Drive with a sleek, retro-futuristic
                interface. Play, organize, and enjoy your favorite tracks anywhere.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => login()}
                startIcon={<CloudIcon />}
                sx={{
                  px: 6,
                  py: 2,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  fontFamily: "Orbitron, sans-serif",
                  background: "linear-gradient(135deg, #ff006e 0%, #ff4d9f 100%)",
                  boxShadow: "0 0 30px rgba(255, 0, 110, 0.6), 0 8px 20px rgba(0, 0, 0, 0.3)",
                  border: "2px solid rgba(255, 0, 110, 0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #ff4d9f 0%, #ff006e 100%)",
                    boxShadow: "0 0 50px rgba(255, 0, 110, 0.9), 0 12px 30px rgba(0, 0, 0, 0.4)",
                    border: "2px solid rgba(255, 0, 110, 0.6)",
                  },
                }}
              >
                Login with Google
              </Button>
            </motion.div>

            {/* 装飾的な要素 */}
            <Box
              sx={{
                position: "absolute",
                top: "20%",
                left: "10%",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255, 0, 110, 0.1) 0%, transparent 70%)",
                filter: "blur(60px)",
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: "10%",
                right: "10%",
                width: "400px",
                height: "400px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0, 245, 212, 0.1) 0%, transparent 70%)",
                filter: "blur(80px)",
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
          </Box>
        )}
      </Container>

      {/* カスタムオーディオプレーヤー */}
      <audio ref={audioRef} autoPlay onEnded={handleAudioEnded} style={{ display: "none" }} />
      <CustomAudioPlayer
        audioRef={audioRef}
        selectedFile={selectedFile}
        onPrevious={musicFiles.length > 1 ? handlePrevious : undefined}
        onNext={musicFiles.length > 1 ? handleNext : undefined}
        playMode={playMode}
        onTogglePlayMode={togglePlayMode}
      />

      {/* Snackbar for copy feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        action={
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleSnackbarClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Box>
  );
}

export default App;
