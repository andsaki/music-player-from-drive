import { createTheme } from '@mui/material/styles';

export const retroTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff006e', // ネオンピンク
      light: '#ff4d9f',
      dark: '#cc0058',
    },
    secondary: {
      main: '#00f5d4', // ネオンシアン
      light: '#33f7de',
      dark: '#00c4a9',
    },
    background: {
      default: '#1a0033', // ディープパープル
      paper: '#2a0a4d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#e0e0e0',
    },
    warning: {
      main: '#fbf8cc', // ネオンイエロー
    },
  },
  typography: {
    fontFamily: 'Inter, Roboto, sans-serif',
    h1: {
      fontFamily: 'Orbitron, sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'Orbitron, sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: 'Orbitron, sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'Orbitron, sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: 'Orbitron, sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: 'Orbitron, sans-serif',
      fontWeight: 600,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1a0033 0%, #3d0066 100%)',
          boxShadow: '0 4px 20px rgba(255, 0, 110, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.3s ease',
        },
        contained: {
          background: 'linear-gradient(135deg, #ff006e 0%, #ff4d9f 100%)',
          boxShadow: '0 0 20px rgba(255, 0, 110, 0.5)',
          '&:hover': {
            boxShadow: '0 0 30px rgba(255, 0, 110, 0.8)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          borderColor: '#ff006e',
          color: '#ff006e',
          boxShadow: '0 0 10px rgba(255, 0, 110, 0.3)',
          '&:hover': {
            borderColor: '#ff4d9f',
            backgroundColor: 'rgba(255, 0, 110, 0.1)',
            boxShadow: '0 0 20px rgba(255, 0, 110, 0.5)',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          marginBottom: '8px',
          border: '1px solid rgba(255, 0, 110, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 0, 110, 0.1)',
            borderColor: '#ff006e',
            boxShadow: '0 0 15px rgba(255, 0, 110, 0.4)',
            transform: 'translateX(5px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#2a0a4d',
          border: '1px solid rgba(255, 0, 110, 0.2)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'linear-gradient(135deg, #2a0a4d 0%, #1a0033 100%)',
          border: '2px solid rgba(0, 245, 212, 0.3)',
          boxShadow: '0 0 40px rgba(0, 245, 212, 0.3)',
        },
      },
    },
  },
});
