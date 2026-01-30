import { useState, useEffect, useRef, lazy, Suspense } from "react";
// MUI コンポーネントを個別インポート（バンドルサイズ最適化）
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import type { SelectChangeEvent } from "@mui/material/Select";
// MUI アイコン（すでに個別インポート）
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import ShareIcon from "@mui/icons-material/Share";
import CloseIcon from "@mui/icons-material/Close";
import CloudIcon from "@mui/icons-material/Cloud";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
// その他のライブラリ
import { useGoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { CustomAudioPlayer } from "./components/CustomAudioPlayer.tsx";
import { MusicListSkeleton, TrackSwitchingIndicator, RetroLoadingSpinner } from "./components/SkeletonScreen.tsx";
import { type DriveFile, type FolderOption } from "./types";
import { ALL_FOLDERS_OPTION, LOCAL_STORAGE_KEYS } from "./constants";
import { generateShareLink, copyToClipboard } from "./utils";

// 遅延ロード: モーダルコンポーネントは必要になるまでロードしない
const FolderManagement = lazy(() => import("./components/FolderManagement.tsx"));
const MemoModal = lazy(() => import("./components/MemoModal.tsx"));

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
  // フォルダ切り替え中のトランジション状態を管理するstate
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
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
  const handleFilterFolderChange = async (event: SelectChangeEvent<string>) => {
    // 音楽を停止
    setSelectedFile(null);
    setPlayingLoading(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    // トランジション開始
    setIsTransitioning(true);

    // 少し待ってからフォルダ切り替え
    await new Promise(resolve => setTimeout(resolve, 150));
    setCurrentFilterFolderId(event.target.value);

    // トランジション完了
    await new Promise(resolve => setTimeout(resolve, 200));
    setIsTransitioning(false);
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
            mt: 2,
          }}
        >
          {/* アクセストークンが存在する場合のみフォルダフィルタリングのドロップダウンとフォルダ追加ボタンを表示 */}
          {accessToken && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <FormControl
                variant="standard"
                sx={{
                  minWidth: 200,
                  "& .MuiInputLabel-root": {
                    color: "#00f5d4",
                    "&.Mui-focused": {
                      color: "#33f7de",
                    },
                  },
                  "& .MuiInput-underline:before": {
                    borderBottomColor: "rgba(0, 245, 212, 0.3)",
                  },
                  "& .MuiInput-underline:hover:before": {
                    borderBottomColor: "rgba(0, 245, 212, 0.5)",
                  },
                  "& .MuiInput-underline:after": {
                    borderBottomColor: "#00f5d4",
                    boxShadow: "0 2px 10px rgba(0, 245, 212, 0.4)",
                  },
                  "& .MuiSelect-select": {
                    color: "#fff",
                    fontWeight: 500,
                  },
                }}
              >
                <InputLabel id="filter-folder-label">フォルダを選択</InputLabel>
                <Select
                  labelId="filter-folder-label"
                  id="filter-folder-select"
                  value={currentFilterFolderId}
                  onChange={handleFilterFolderChange}
                  label="フォルダを選択"
                  sx={{
                    "& .MuiSvgIcon-root": {
                      color: "#00f5d4",
                    },
                  }}
                >
                  {folderOptions.map((option: FolderOption) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {currentFilterFolderId === "all" ? (
                <Button
                  variant="outlined"
                  onClick={() => setOpenFolderManagement(true)}
                  sx={{
                    borderColor: "#00f5d4",
                    color: "#00f5d4",
                    fontWeight: 600,
                    px: 3,
                    boxShadow: "0 0 10px rgba(0, 245, 212, 0.3)",
                    "&:hover": {
                      borderColor: "#33f7de",
                      backgroundColor: "rgba(0, 245, 212, 0.1)",
                      boxShadow: "0 0 20px rgba(0, 245, 212, 0.5)",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  フォルダを追加
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => setOpenMemoModal(true)}
                  sx={{
                    borderColor: "#fbf8cc",
                    color: "#fbf8cc",
                    fontWeight: 600,
                    px: 3,
                    boxShadow: "0 0 10px rgba(251, 248, 204, 0.3)",
                    "&:hover": {
                      borderColor: "#ffffff",
                      backgroundColor: "rgba(251, 248, 204, 0.1)",
                      boxShadow: "0 0 20px rgba(251, 248, 204, 0.5)",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  メモ
                </Button>
              )}
            </Box>
          )}
        </Box>
        {/* FolderManagement モーダルコンポーネント（遅延ロード） */}
        <Suspense fallback={null}>
          <FolderManagement
            open={openFolderManagement}
            onClose={() => setOpenFolderManagement(false)}
            onAddFolder={handleAddFolder}
            accessToken={accessToken} // accessTokenを渡す
          />
        </Suspense>
        {/* MemoModal コンポーネント（遅延ロード） */}
        <Suspense fallback={null}>
          <MemoModal
            open={openMemoModal}
            onClose={() => setOpenMemoModal(false)}
            folderId={currentFilterFolderId}
            folderName={
              folderOptions.find((option: FolderOption) => option.id === currentFilterFolderId)
                ?.name || ALL_FOLDERS_OPTION.name
            }
          />
        </Suspense>
        {/* アクセストークンが存在する場合の表示ロジック */}
        {accessToken ? (
          loading ? (
            <RetroLoadingSpinner />
          ) : isTransitioning ? (
            <MusicListSkeleton count={8} />
          ) : (
            <Box sx={{ mt: 3 }}>
              {musicFiles.length > 0 ? (
                <AnimatePresence>
                  {musicFiles.map((file) => {
                    const isPlaying = selectedFile?.id === file.id;
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        <Box
                          onClick={() => playMusic(file)}
                          sx={{
                            mb: 2,
                            p: 2,
                            borderRadius: "12px",
                            background: isPlaying
                              ? "linear-gradient(135deg, rgba(255, 0, 110, 0.15), rgba(0, 245, 212, 0.1))"
                              : "rgba(42, 10, 77, 0.6)",
                            border: isPlaying
                              ? "2px solid"
                              : "1px solid rgba(255, 0, 110, 0.2)",
                            borderImage: isPlaying
                              ? "linear-gradient(90deg, #ff006e, #00f5d4) 1"
                              : "none",
                            boxShadow: isPlaying
                              ? "0 0 20px rgba(255, 0, 110, 0.4), 0 0 40px rgba(0, 245, 212, 0.2)"
                              : "0 2px 8px rgba(0, 0, 0, 0.3)",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backdropFilter: "blur(10px)",
                            position: "relative",
                            overflow: "hidden",
                            "&:hover": {
                              transform: "translateX(8px)",
                              boxShadow: "0 4px 20px rgba(255, 0, 110, 0.5), 0 0 30px rgba(0, 245, 212, 0.3)",
                              border: "1px solid rgba(255, 0, 110, 0.5)",
                              background: isPlaying
                                ? "linear-gradient(135deg, rgba(255, 0, 110, 0.2), rgba(0, 245, 212, 0.15))"
                                : "rgba(42, 10, 77, 0.8)",
                            },
                            "&::before": isPlaying
                              ? {
                                  content: '""',
                                  position: "absolute",
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: "4px",
                                  background: "linear-gradient(180deg, #ff006e, #00f5d4)",
                                  boxShadow: "0 0 10px rgba(255, 0, 110, 0.8)",
                                }
                              : {},
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                            <Box
                              sx={{
                                mr: 2,
                                width: 48,
                                height: 48,
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: isPlaying
                                  ? "linear-gradient(135deg, #ff006e, #ff4d9f)"
                                  : "rgba(255, 0, 110, 0.2)",
                                boxShadow: isPlaying
                                  ? "0 0 15px rgba(255, 0, 110, 0.6)"
                                  : "none",
                                transition: "all 0.3s ease",
                              }}
                            >
                              {isPlaying ? (
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                  <PlayArrowIcon sx={{ color: "#fff" }} />
                                </motion.div>
                              ) : (
                                <MusicNoteIcon sx={{ color: "#ff006e" }} />
                              )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontWeight: isPlaying ? 600 : 400,
                                  fontSize: "1rem",
                                  color: isPlaying ? "#00f5d4" : "text.primary",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  textShadow: isPlaying ? "0 0 10px rgba(0, 245, 212, 0.5)" : "none",
                                }}
                              >
                                {file.name}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {playingLoading && selectedFile?.id === file.id && (
                              <TrackSwitchingIndicator />
                            )}
                            <IconButton
                              onClick={(e) => handleShareClick(e, file.id)}
                              sx={{
                                color: "#00f5d4",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                  color: "#33f7de",
                                  transform: "scale(1.1) rotate(10deg)",
                                  background: "rgba(0, 245, 212, 0.1)",
                                },
                              }}
                            >
                              <ShareIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  sx={{
                    textAlign: "center",
                    py: 8,
                    px: 4,
                    borderRadius: "16px",
                    background: "rgba(42, 10, 77, 0.4)",
                    border: "1px dashed rgba(255, 0, 110, 0.3)",
                  }}
                >
                  <MusicNoteIcon
                    sx={{
                      fontSize: 80,
                      color: "rgba(255, 0, 110, 0.3)",
                      mb: 2,
                    }}
                  />
                  <Typography
                    variant="h6"
                    sx={{
                      color: "text.secondary",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    音楽ファイルが見つかりませんでした
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      mt: 1,
                      opacity: 0.7,
                    }}
                  >
                    Google Driveに音楽ファイルを追加してください
                  </Typography>
                </Box>
              )}
            </Box>
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
                Google Driveの音楽をストリーミング
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
                Google Driveに保存された音楽ライブラリに、レトロフューチャーな
                インターフェースでアクセス。どこでもお気に入りの曲を再生、整理、楽しめます。
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
                Googleでログイン
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
        isLoading={playingLoading}
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
