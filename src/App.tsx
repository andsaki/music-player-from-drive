import { useState, useEffect, useRef } from 'react';
import { AppBar, Box, CssBaseline, Toolbar, Typography, Container, Paper, List, ListItem, ListItemText, Button } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

// Define the structure of a file from Google Drive API
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem('googleAccessToken'));
  const [musicFiles, setMusicFiles] = useState<DriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
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
    setMusicFiles([]); // Clear music files on logout
    setSelectedFile(null); // Clear selected file on logout
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  useEffect(() => {
    console.log("Current accessToken:", accessToken);
    if (accessToken) {
      const fetchMusicFiles = async () => {
        try {
          const response = await axios.get(
            'https://www.googleapis.com/drive/v3/files',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              params: {
                q: "'1hxrPx7JxNbqmLhJz-xd4FSkNgg44VOXq' in parents and mimeType contains 'audio/'",
                fields: 'files(id, name, mimeType)',
              },
            }
          );
          console.log("Fetched music files:", response.data.files);
          setMusicFiles(response.data.files || []);
        } catch (error: unknown) {
          console.error('Error fetching music files:', error);
          // If token is invalid, clear it to prompt re-login
          if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
            handleLogout();
          }
        }
      };

      fetchMusicFiles();
    }
  }, [accessToken]);

  const playMusic = async (file: DriveFile) => {
    setSelectedFile(file);
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
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <MusicNoteIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Music Player from Google Drive
          </Typography>
          <Button color="inherit" onClick={() => login()}>
            Login with Google
          </Button>
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ mt: 4, mb: 2, flexGrow: 1 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Track List
        </Typography>
        {accessToken ? (
          <List>
            {musicFiles.length > 0 ? (
              musicFiles.map((file) => (
                <ListItem component="button" key={file.id} onClick={() => playMusic(file)}>
                  <ListItemText primary={file.name} />
                </ListItem>
              ))
            ) : (
              <Typography>No music files found in your Google Drive.</Typography>
            )}
          </List>
        ) : (
          <Typography>Please log in to see your music files.</Typography>
        )}
      </Container>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} elevation={3}>
          {selectedFile && (
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Now Playing: {selectedFile.name}
            </Typography>
          )}
          <audio ref={audioRef} controls style={{ width: '100%', marginTop: '10px' }} />
      </Paper>
    </Box>
  );
}

export default App;
