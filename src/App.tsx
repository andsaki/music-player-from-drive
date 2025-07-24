import { AppBar, Box, CssBaseline, Toolbar, Typography, Container, Paper } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <MusicNoteIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Music Player from Google Drive
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container component="main" sx={{ mt: 4, mb: 2, flexGrow: 1 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Track List
        </Typography>
        {/* This is where the list of songs will be displayed. */}
        <Typography>
          Songs from your Google Drive will appear here.
        </Typography>
      </Container>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }} elevation={3}>
          <SkipPreviousIcon />
          <PlayArrowIcon sx={{ mx: 2 }} />
          <PauseIcon sx={{ mx: 2 }}/>
          <SkipNextIcon />
      </Paper>
    </Box>
  );
}

export default App;
