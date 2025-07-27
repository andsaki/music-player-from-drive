import { useState, useEffect, useRef } from 'react';
import { AppBar, Box, CssBaseline, Toolbar, Typography, Container, Paper, List, ListItemText, Button, CircularProgress, Select, MenuItem, FormControl, InputLabel, Snackbar, IconButton, ListItemButton } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import type { SelectChangeEvent } from '@mui/material/Select';
import FolderManagement from './components/FolderManagement.tsx';
import MemoModal from './components/MemoModal.tsx';
import { type DriveFile, type FolderOption } from './types';
import { ALL_FOLDERS_OPTION, LOCAL_STORAGE_KEYS } from './constants';

function App() {
  // フィルタリングオプションとして利用するフォルダの定義
  // useStateを使用して動的に管理できるようにする
  // localStorageから初期値を読み込み、変更があればlocalStorageに保存する
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>(() => {
    const savedFolderOptions = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLDER_OPTIONS);
    if (savedFolderOptions) {
      return JSON.parse(savedFolderOptions);
    } else {
      return [
        ALL_FOLDERS_OPTION,
      ];
    }
  });

  // folderOptionsが変更されるたびにlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLDER_OPTIONS, JSON.stringify(folderOptions));
  }, [folderOptions]);

  // Googleアクセストークンを管理するstate。sessionStorageから初期値を読み込む。
  const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem(LOCAL_STORAGE_KEYS.GOOGLE_ACCESS_TOKEN));
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
  const [currentFilterFolderId, setCurrentFilterFolderId] = useState<string>('all');
  // audio要素への参照を保持するref
  const audioRef = useRef<HTMLAudioElement>(null);

  // フォルダ管理モーダルの開閉状態を管理するstate
  const [openFolderManagement, setOpenFolderManagement] = useState(false);
  const [openMemoModal, setOpenMemoModal] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 新しいフォルダが追加されたときのハンドラ
  const handleAddFolder = (newFolder: FolderOption) => {
    setFolderOptions((prevOptions: Array<{ id: string; name: string }>) => [...prevOptions, newFolder]);
  };

  // Googleログイン処理のフック
  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      console.log("Login successful! Token response:", tokenResponse);
      setAccessToken(tokenResponse.access_token);
      sessionStorage.setItem(LOCAL_STORAGE_KEYS.GOOGLE_ACCESS_TOKEN, tokenResponse.access_token); // アクセストークンをsessionStorageに保存
    },
    onError: errorResponse => console.log("Login failed! Error:", errorResponse),
    scope: 'https://www.googleapis.com/auth/drive.readonly', // Google Driveの読み取り専用スコープ
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
      audioRef.current.src = ''; // audioソースをクリア
    }
  };

  // フォルダフィルタリングの変更ハンドラ
  const handleFilterFolderChange = (event: SelectChangeEvent<string>) => {
    setCurrentFilterFolderId(event.target.value); // 選択されたフォルダIDを更新
    setSelectedFile(null); // 選択中のファイルをクリア
    setPlayingLoading(false); // 再生ローディング状態をリセット
    if (audioRef.current) {
      audioRef.current.pause(); // 再生中の音楽を停止
      audioRef.current.src = ''; // audioソースをクリア
    }
  };

  // 音楽ファイルをフェッチする関数
  const fetchMusicFiles = async () => {
    if (!accessToken) return;

    setLoading(true); // フェッチ開始時にローディング状態をtrueに設定
    try {
      const allFiles: DriveFile[] = [];
      // 定義された各フォルダから音楽ファイルをフェッチ（'all'オプションは除く）
      for (const folder of folderOptions.filter((opt: { id: string; name: string }) => opt.id !== 'all')) {
        const response = await axios.get(
          'https://www.googleapis.com/drive/v3/files',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`, // アクセストークンをヘッダーに含める
            },
            params: {
              q: `'${folder.id}' in parents and mimeType contains 'audio/'`, // フォルダ内のオーディオファイルを検索
              fields: 'files(id, name, mimeType, modifiedTime, parents)', // 取得するフィールドを指定
            },
          }
        );
        allFiles.push(...(response.data.files || [])); // 取得したファイルをリストに追加
      }
      // 最終更新日時で降順にソート（新しいものが先頭）
      allFiles.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

      console.log("Fetched music files:", allFiles);
      setAllFetchedMusicFiles(allFiles); // 全ての音楽ファイルをstateに保存
    } catch (error: unknown) {
      console.error('Error fetching music files:', error);
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
    if (currentFilterFolderId === 'all') {
      setMusicFiles(allFetchedMusicFiles); // 「全て」が選択されている場合は、全てのファイルをそのまま表示
    } else {
      // 選択されたフォルダIDに基づいてファイルをフィルタリング
      const filtered = allFetchedMusicFiles.filter(file =>
        file.parents && file.parents.includes(currentFilterFolderId)
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
          responseType: 'blob', // バイナリデータとしてレスポンスを受け取る
        }
      );
      const audioUrl = URL.createObjectURL(response.data); // BlobからURLを作成
      if (audioRef.current) {
        audioRef.current.src = audioUrl; // audioソースを設定
        audioRef.current.play(); // 音楽を再生
      }
    } catch (error: unknown) {
      console.error('Error playing music:', error);
    } finally {
      setPlayingLoading(false); // 再生完了後にローディング状態をfalseに設定
      console.log("Playing loading set to false for file:", file.name);
    }
  };

  // Google Driveの共有リンクを生成する関数
  const generateShareLink = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  };

  // クリップボードにテキストをコピーする関数
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMessage('共有リンクをコピーしました！');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setSnackbarMessage('共有リンクのコピーに失敗しました。');
      setSnackbarOpen(true);
    }
  };

  // Snackbarを閉じるハンドラ
  const handleSnackbarClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      {/* アプリケーションのヘッダー部分 */}
      <AppBar position="static">
        <Toolbar sx={{ gap: 2, mt: 0, mb: 0 }}>
          <MusicNoteIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Music Player from Google Drive
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
      <Container component="main" sx={{ mt: 0, mb: 2, flexGrow: 1, overflowY: 'auto', paddingBottom: '120px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          {/* 「Track List」の表示を削除 */}
          {/* アクセストークンが存在する場合のみフォルダフィルタリングのドロップダウンとフォルダ追加ボタンを表示 */}
          {accessToken && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              {currentFilterFolderId === 'all' ? (
                <Button variant="outlined" onClick={() => setOpenFolderManagement(true)}>
                  Add Folder
                </Button>
              ) : (
                <Button variant="outlined" onClick={() => setOpenMemoModal(true)}>Memo</Button>
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
          folderName={folderOptions.find((option: FolderOption) => option.id === currentFilterFolderId)?.name || ALL_FOLDERS_OPTION.name}
        />
        {/* アクセストークンが存在する場合の表示ロジック */}
        {accessToken ? (
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress /> {/* ローディング中の表示 */}
            </Box>
          ) : (
            <List>
              {musicFiles.length > 0 ? (
                musicFiles.map((file) => (
                  <ListItemButton
                    key={file.id}
                    onClick={() => playMusic(file)}
                    sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} // Flexboxで配置を調整
                  >
                    <ListItemText primary={file.name} />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {playingLoading && selectedFile?.id === file.id && (
                        <CircularProgress size={20} sx={{ ml: 2 }} /> // 再生中のローディング表示
                      )}
                      <IconButton edge="end" aria-label="share" onClick={(e) => {
                        e.stopPropagation(); // 親要素のonClickイベントが発火しないようにする
                        copyToClipboard(generateShareLink(file.id));
                      }}>
                        <ShareIcon />
                      </IconButton>
                    </Box>
                  </ListItemButton>
                ))
              ) : (
                <Typography>No music files found in your Google Drive.</Typography> // 音楽ファイルが見つからない場合のメッセージ
              )}
            </List>
          )
        ) : (
          /* ログインボタンをヘッダーからメインコンテンツエリアに移動し、メッセージを削除 */
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button variant="contained" onClick={() => login()}>
              Login with Google
            </Button>
          </Box>
        )}
      </Container>

      {/* 音楽プレーヤーコントロール部分 */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} elevation={3}>
          {selectedFile && (
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Now Playing: {selectedFile.name} {/* 現在再生中のファイル名を表示 */}
            </Typography>
          )}
          {/* 曲の再生終了時に次の曲を自動再生するロジックを追加 */}
          <audio ref={audioRef} controls autoPlay style={{ width: '100%', marginTop: '10px' }} onEnded={() => {
            if (selectedFile) {
              const currentIndex = musicFiles.findIndex(file => file.id === selectedFile.id);
              if (currentIndex !== -1 && currentIndex < musicFiles.length - 1) {
                playMusic(musicFiles[currentIndex + 1]); // 次の曲を再生
              }
            }
          }} />
      </Paper>

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