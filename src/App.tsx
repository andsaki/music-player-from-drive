import { useState, useEffect, useRef } from 'react';
import { AppBar, Box, CssBaseline, Toolbar, Typography, Container, Paper, List, ListItem, ListItemText, Button, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import type { SelectChangeEvent } from '@mui/material/Select';

// Google Drive APIから取得するファイルの構造を定義
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string; // 最終更新日時
  parents: string[]; // 親フォルダのID
}

// フィルタリングオプションとして利用するフォルダの定義
const folderOptions = [
  { id: 'all', name: 'All Folders' }, // 全てのフォルダを表示するオプション
  { id: import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID, name: 'Folder 1' }, // 環境変数から取得したフォルダID
  { id: import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID_2, name: 'Folder 2' }, // 環境変数から取得した別のフォルダID
];

function App() {
  // Googleアクセストークンを管理するstate。sessionStorageから初期値を読み込む。
  const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem('googleAccessToken'));
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

  // Googleログイン処理のフック
  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      console.log("Login successful! Token response:", tokenResponse);
      setAccessToken(tokenResponse.access_token);
      sessionStorage.setItem('googleAccessToken', tokenResponse.access_token); // アクセストークンをsessionStorageに保存
    },
    onError: errorResponse => console.log("Login failed! Error:", errorResponse),
    scope: 'https://www.googleapis.com/auth/drive.readonly', // Google Driveの読み取り専用スコープ
  });

  // ログアウト処理
  const handleLogout = () => {
    setAccessToken(null); // アクセストークンをクリア
    sessionStorage.removeItem('googleAccessToken'); // sessionStorageからアクセストークンを削除
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

  // アクセストークンが変更されたときに音楽ファイルをフェッチするuseEffect
  useEffect(() => {
    console.log("Current accessToken:", accessToken);
    if (accessToken) {
      const fetchMusicFiles = async () => {
        setLoading(true); // フェッチ開始時にローディング状態をtrueに設定
        try {
          const allFiles: DriveFile[] = [];
          // 定義された各フォルダから音楽ファイルをフェッチ（'all'オプションは除く）
          for (const folder of folderOptions.filter(opt => opt.id !== 'all')) {
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

      fetchMusicFiles();
    }
  }, [accessToken]); // accessTokenが変更されたときにのみ実行

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
          {/* アクセストークンが存在する場合のみフォルダフィルタリングのドロップダウンを表示 */}
          {accessToken && (
            <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
              <InputLabel id="filter-folder-label">Filter Folder</InputLabel>
              <Select
                labelId="filter-folder-label"
                id="filter-folder-select"
                value={currentFilterFolderId}
                onChange={handleFilterFolderChange}
                label="Filter Folder"
              >
                {folderOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
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
                  <ListItem component="button" key={file.id} onClick={() => playMusic(file)} sx={{ mb: 1 }}>
                    <ListItemText primary={file.name} />
                    {playingLoading && selectedFile?.id === file.id && (
                      <CircularProgress size={20} sx={{ ml: 2 }} /> // 再生中のローディング表示
                    )}
                  </ListItem>
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
    </Box>
  );
}

export default App;

