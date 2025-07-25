import { useState, useEffect, useRef } from 'react';
import { AppBar, Box, CssBaseline, Toolbar, Typography, Container, Paper, List, ListItem, ListItemText, Button, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

// Define the structure of a file from Google Drive API
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string; // Add modifiedTime
  parents: string[]; // Add parents
}

const folderOptions = [
  { id: 'all', name: 'All Folders' }, // Option to show all folders
  { id: import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID, name: 'Folder 1' },
  { id: import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID_2, name: 'Folder 2' },
];

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem('googleAccessToken'));
  const [allFetchedMusicFiles, setAllFetchedMusicFiles] = useState<DriveFile[]>([]); // All fetched files
  const [musicFiles, setMusicFiles] = useState<DriveFile[]>([]); // Filtered files for display
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // New loading state
  const [playingLoading, setPlayingLoading] = useState<boolean>(false); // New playing loading state
  const [currentFilterFolderId, setCurrentFilterFolderId] = useState<string>('all'); // Default to all folders
  const audioRef = useRef<HTMLAudioElement>(null);

  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      console.log("Login successful! Token response:", tokenResponse);
      setAccessToken(tokenResponse.access_token);
      sessionStorage.setItem('googleAccessToken', tokenResponse.access_token);
    },
    onError: errorResponse => console.log("Login failed! Error:", errorResponse),
    scope: 'https://www.googleapis.com/auth/drive.readonly',
  });

  const handleLogout = () => {
    setAccessToken(null);
    sessionStorage.removeItem('googleAccessToken');
    setAllFetchedMusicFiles([]); // Clear all fetched files on logout
    setMusicFiles([]); // Clear music files on logout
    setSelectedFile(null); // Clear selected file on logout
    setPlayingLoading(false); // Reset playing loading state on logout
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  const handleFilterFolderChange = (event: SelectChangeEvent<string>) => {
    setCurrentFilterFolderId(event.target.value);
    setSelectedFile(null); // Clear selected file on folder change
    setPlayingLoading(false); // Reset playing loading state
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  useEffect(() => {
    console.log("Current accessToken:", accessToken);
    if (accessToken) {
      const fetchMusicFiles = async () => {
        setLoading(true); // Set loading to true before fetching
        try {
          const allFiles: DriveFile[] = [];
          for (const folder of folderOptions.filter(opt => opt.id !== 'all')) { // Exclude 'all' option
            const response = await axios.get(
              'https://www.googleapis.com/drive/v3/files',
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                params: {
                  q: `'${folder.id}' in parents and mimeType contains 'audio/'`,
                  fields: 'files(id, name, mimeType, modifiedTime, parents)', // Request modifiedTime and parents
                },
              }
            );
            allFiles.push(...(response.data.files || []));
          }
          // Sort by modifiedTime in descending order (newest first)
          allFiles.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
          
          console.log("Fetched music files:", allFiles);
          setAllFetchedMusicFiles(allFiles);
        } catch (error: unknown) {
          console.error('Error fetching music files:', error);
          // If token is invalid, clear it to prompt re-login
          if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
            handleLogout();
          }
        } finally {
          setLoading(false); // Set loading to false after fetching (success or error)
        }
      };

      fetchMusicFiles();
    }
  }, [accessToken]); // Only depends on accessToken

  // Effect to filter music files based on currentFilterFolderId
  useEffect(() => {
    if (currentFilterFolderId === 'all') {
      setMusicFiles(allFetchedMusicFiles);
    } else {
      const filtered = allFetchedMusicFiles.filter(file => 
        file.parents && file.parents.includes(currentFilterFolderId)
      );
      setMusicFiles(filtered);
    }
  }, [currentFilterFolderId, allFetchedMusicFiles]);

  const playMusic = async (file: DriveFile) => {
    setSelectedFile(file);
    setPlayingLoading(true); // Set playing loading to true before fetching audio
    console.log("Playing loading set to true for file:", file.name);
    try {
      const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          responseType: 'blob', // Important for binary data
        }
      );
      const audioUrl = URL.createObjectURL(response.data);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error: unknown) {
      console.error('Error playing music:', error);
    } finally {
      setPlayingLoading(false); // Set playing loading to false after playing (success or error)
      console.log("Playing loading set to false for file:", file.name);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar sx={{ gap: 2, mt: 0, mb: 0 }}>
          <MusicNoteIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Music Player from Google Drive
          </Typography>
          {accessToken && (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>
      
      <Container component="main" sx={{ mt: 0, mb: 2, flexGrow: 1, overflowY: 'auto', paddingBottom: '120px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          {/* 「Track List」の表示を削除 */}
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
        {accessToken ? (
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {musicFiles.length > 0 ? (
                musicFiles.map((file) => (
                  <ListItem component="button" key={file.id} onClick={() => playMusic(file)} sx={{ mb: 1 }}>
                    <ListItemText primary={file.name} />
                    {playingLoading && selectedFile?.id === file.id && (
                      <CircularProgress size={20} sx={{ ml: 2 }} />
                    )}
                  </ListItem>
                ))
              ) : (
                <Typography>No music files found in your Google Drive.</Typography>
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

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} elevation={3}>
          {selectedFile && (
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Now Playing: {selectedFile.name}
            </Typography>
          )}
          {/* 曲の再生終了時に次の曲を自動再生するロジックを追加 */}
          <audio ref={audioRef} controls autoPlay style={{ width: '100%', marginTop: '10px' }} onEnded={() => {
            if (selectedFile) {
              const currentIndex = musicFiles.findIndex(file => file.id === selectedFile.id);
              if (currentIndex !== -1 && currentIndex < musicFiles.length - 1) {
                playMusic(musicFiles[currentIndex + 1]);
              }
            }
          }} />
      </Paper>
    </Box>
  );
}

export default App;
