import React, { useState, useEffect } from 'react';
import { Box, IconButton, Slider, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import { motion } from 'framer-motion';

interface CustomAudioPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  selectedFile: { id: string; name: string } | null;
  onPrevious?: () => void;
  onNext?: () => void;
  playMode: "repeat-all" | "repeat-one" | "none";
  onTogglePlayMode: () => void;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  audioRef,
  selectedFile,
  onPrevious,
  onNext,
  playMode,
  onTogglePlayMode,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioRef]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleSeek = (_event: Event, value: number | number[]) => {
    if (audioRef.current) {
      const newTime = value as number;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (_event: Event, value: number | number[]) => {
    if (audioRef.current) {
      const newVolume = value as number;
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!selectedFile) return null;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, rgba(26,0,51,0.95) 0%, rgba(61,0,102,0.98) 100%)',
        backdropFilter: 'blur(10px)',
        borderTop: '2px solid',
        borderImage: 'linear-gradient(90deg, #ff006e, #00f5d4, #fbf8cc) 1',
        boxShadow: '0 -4px 30px rgba(255, 0, 110, 0.4)',
        p: 3,
        zIndex: 1100,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          textAlign: 'center',
          background: 'linear-gradient(90deg, #ff006e, #00f5d4)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {selectedFile.name}
      </Typography>

      {/* シークバー */}
      <Box sx={{ mb: 2 }}>
        <Slider
          value={currentTime}
          max={duration || 100}
          onChange={handleSeek}
          sx={{
            color: '#ff006e',
            height: 6,
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              boxShadow: '0 0 15px rgba(255, 0, 110, 0.8)',
              transition: 'all 0.2s',
              '&:hover': {
                boxShadow: '0 0 20px rgba(255, 0, 110, 1)',
              },
            },
            '& .MuiSlider-track': {
              background: 'linear-gradient(90deg, #ff006e, #00f5d4)',
              boxShadow: '0 0 10px rgba(255, 0, 110, 0.5)',
            },
            '& .MuiSlider-rail': {
              opacity: 0.3,
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatTime(currentTime)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(duration)}
          </Typography>
        </Box>
      </Box>

      {/* コントロールボタン */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={onPrevious}
            disabled={!onPrevious}
            sx={{
              color: '#00f5d4',
              '&:hover': { color: '#33f7de', transform: 'scale(1.1)' },
              transition: 'all 0.3s ease',
              '&.Mui-disabled': { color: 'rgba(0, 245, 212, 0.3)' },
            }}
          >
            <SkipPreviousIcon fontSize="large" />
          </IconButton>

          <IconButton
            onClick={handlePlayPause}
            sx={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #ff006e, #ff4d9f)',
              boxShadow: '0 0 25px rgba(255, 0, 110, 0.6)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(135deg, #ff4d9f, #ff006e)',
                boxShadow: '0 0 35px rgba(255, 0, 110, 0.9)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
          </IconButton>

          <IconButton
            onClick={onNext}
            disabled={!onNext}
            sx={{
              color: '#00f5d4',
              '&:hover': { color: '#33f7de', transform: 'scale(1.1)' },
              transition: 'all 0.3s ease',
              '&.Mui-disabled': { color: 'rgba(0, 245, 212, 0.3)' },
            }}
          >
            <SkipNextIcon fontSize="large" />
          </IconButton>
        </Box>

        {/* 再生モードとボリューム */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 再生モードボタン */}
          <IconButton
            onClick={onTogglePlayMode}
            sx={{
              color: playMode === 'none' ? 'rgba(251, 248, 204, 0.5)' : '#fbf8cc',
              '&:hover': { color: '#ffffff', transform: 'scale(1.1)' },
              transition: 'all 0.3s ease',
            }}
          >
            {playMode === 'repeat-all' && <RepeatIcon />}
            {playMode === 'repeat-one' && <RepeatOneIcon />}
            {playMode === 'none' && <RepeatIcon />}
          </IconButton>

          {/* 音量コントロール */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 150 }}>
            <IconButton
              onClick={toggleMute}
              sx={{
                color: '#fbf8cc',
                '&:hover': { color: '#ffffff', transform: 'scale(1.1)' },
                transition: 'all 0.3s ease',
              }}
            >
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>
            <Slider
              value={isMuted ? 0 : volume}
              max={1}
              step={0.01}
              onChange={handleVolumeChange}
              sx={{
                color: '#fbf8cc',
                ml: 1,
                '& .MuiSlider-thumb': {
                  boxShadow: '0 0 10px rgba(251, 248, 204, 0.6)',
                  '&:hover': {
                    boxShadow: '0 0 15px rgba(251, 248, 204, 0.9)',
                  },
                },
                '& .MuiSlider-track': {
                  boxShadow: '0 0 5px rgba(251, 248, 204, 0.4)',
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
