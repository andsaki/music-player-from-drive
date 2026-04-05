import React, { useState, useEffect } from 'react';
// MUI コンポーネントを個別インポート（バンドルサイズ最適化）
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
// MUI アイコン（すでに個別インポート）
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import Replay10Icon from '@mui/icons-material/Replay10';
import Replay30Icon from '@mui/icons-material/Replay30';
import Forward10Icon from '@mui/icons-material/Forward10';
import Forward30Icon from '@mui/icons-material/Forward30';
import { motion } from 'framer-motion';

interface CustomAudioPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  selectedFile: { id: string; name: string } | null;
  onPrevious?: () => void;
  onNext?: () => void;
  playMode: "repeat-all" | "repeat-one" | "none";
  onTogglePlayMode: () => void;
  isLoading?: boolean;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  audioRef,
  selectedFile,
  onPrevious,
  onNext,
  playMode,
  onTogglePlayMode,
  isLoading = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);

  // iOSを検出（MSStreamはIE11のUser Agent判定用）
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

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

  const handleSkipBackward = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - seconds);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkipForward = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.min(duration, audioRef.current.currentTime + seconds);
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

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number } }) => {
    setDragY(info.offset.y);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number } }) => {
    const threshold = 100;
    if (info.offset.y < -threshold) {
      setIsExpanded(true);
      setDragY(0);
    } else if (info.offset.y > threshold) {
      setIsExpanded(false);
      setDragY(0);
    } else {
      setDragY(0);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!selectedFile) return null;

  return (
    <Box
      component={motion.div}
      drag="y"
      dragConstraints={{ top: -200, bottom: 0 }}
      dragElastic={{ top: 0.2, bottom: 0 }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 50 }}
      animate={{
        opacity: 1,
        y: dragY,
        height: isExpanded ? '100vh' : 'auto',
        top: isExpanded ? 0 : 'auto',
        boxShadow: isLoading
          ? [
              '0 -4px 30px rgba(255, 0, 110, 0.4)',
              '0 -4px 40px rgba(255, 0, 110, 0.6), 0 -8px 60px rgba(0, 245, 212, 0.4)',
              '0 -4px 30px rgba(255, 0, 110, 0.4)',
            ]
          : '0 -4px 30px rgba(255, 0, 110, 0.4)',
      }}
      transition={{
        height: { duration: 0.3, ease: "easeInOut" },
        top: { duration: 0.3, ease: "easeInOut" },
        boxShadow: {
          duration: 1.5,
          repeat: isLoading ? Infinity : 0,
          ease: "easeInOut",
        }
      }}
      sx={{
        position: 'fixed',
        bottom: isExpanded ? 'auto' : 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, rgba(26,0,51,0.95) 0%, rgba(61,0,102,0.98) 100%)',
        backdropFilter: 'blur(10px)',
        borderTop: '2px solid',
        borderImage: 'linear-gradient(90deg, #ff006e, #00f5d4, #fbf8cc) 1',
        pt: isExpanded ? 'calc(env(safe-area-inset-top) + 16px)' : 3,
        px: { xs: 1.5, sm: 3 },
        pb: 'calc(24px + env(safe-area-inset-bottom))',
        zIndex: 1100,
        overflow: isExpanded ? 'auto' : 'visible',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ドラッグハンドル */}
      <Box
        onClick={toggleExpanded}
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 1,
          cursor: 'pointer',
          '&:hover .drag-indicator': {
            background: 'linear-gradient(90deg, #ff006e, #00f5d4)',
            boxShadow: '0 0 10px rgba(255, 0, 110, 0.6)',
          }
        }}
      >
        <Box
          className="drag-indicator"
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.3)',
            transition: 'all 0.3s ease',
          }}
        />
      </Box>

      {/* 展開時の大きなビュー */}
      {isExpanded && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
          }}
        >
          {/* アルバムアート風のアイコン */}
          <Box
            sx={{
              width: { xs: 250, sm: 300 },
              height: { xs: 250, sm: 300 },
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ff006e, #ff4d9f, #00f5d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 4,
              boxShadow: '0 0 40px rgba(255, 0, 110, 0.6), 0 0 80px rgba(0, 245, 212, 0.3)',
            }}
          >
            <VolumeUpIcon sx={{ fontSize: { xs: 120, sm: 150 }, color: '#fff' }} />
          </Box>

          {/* 曲名 */}
          <Typography
            variant="h4"
            component={motion.div}
            animate={isLoading ? {
              opacity: [0.5, 1, 0.5],
            } : {
              opacity: 1,
            }}
            transition={{
              duration: 1.5,
              repeat: isLoading ? Infinity : 0,
              ease: "easeInOut",
            }}
            sx={{
              mb: 1,
              textAlign: 'center',
              background: 'linear-gradient(90deg, #ff006e, #00f5d4)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700,
              px: 2,
              filter: isLoading ? 'blur(1px)' : 'blur(0)',
              transition: 'filter 0.3s ease',
            }}
          >
            {selectedFile.name}
          </Typography>
        </Box>
      )}

      {/* 縮小時のコンパクトビュー */}
      {!isExpanded && (
        <Typography
          variant="h6"
          component={motion.div}
          animate={isLoading ? {
            opacity: [0.5, 1, 0.5],
          } : {
            opacity: 1,
          }}
          transition={{
            duration: 1.5,
            repeat: isLoading ? Infinity : 0,
            ease: "easeInOut",
          }}
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
            filter: isLoading ? 'blur(1px)' : 'blur(0)',
            transition: 'filter 0.3s ease',
          }}
        >
          {selectedFile.name}
        </Typography>
      )}

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
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
            onClick={() => handleSkipBackward(30)}
            disabled={!selectedFile || duration === 0}
            sx={{
              color: '#00f5d4',
              '&:hover': { color: '#33f7de', transform: 'scale(1.1)' },
              transition: 'all 0.3s ease',
              '&.Mui-disabled': { color: 'rgba(0, 245, 212, 0.3)' },
            }}
          >
            <Replay30Icon />
          </IconButton>

          <IconButton
            onClick={() => handleSkipBackward(10)}
            disabled={!selectedFile || duration === 0}
            sx={{
              color: '#00f5d4',
              '&:hover': { color: '#33f7de', transform: 'scale(1.1)' },
              transition: 'all 0.3s ease',
              '&.Mui-disabled': { color: 'rgba(0, 245, 212, 0.3)' },
            }}
          >
            <Replay10Icon />
          </IconButton>

          <IconButton
            onClick={handlePlayPause}
            sx={{
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
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
            onClick={() => handleSkipForward(10)}
            disabled={!selectedFile || duration === 0}
            sx={{
              color: '#00f5d4',
              '&:hover': { color: '#33f7de', transform: 'scale(1.1)' },
              transition: 'all 0.3s ease',
              '&.Mui-disabled': { color: 'rgba(0, 245, 212, 0.3)' },
            }}
          >
            <Forward10Icon />
          </IconButton>

          <IconButton
            onClick={() => handleSkipForward(30)}
            disabled={!selectedFile || duration === 0}
            sx={{
              color: '#00f5d4',
              '&:hover': { color: '#33f7de', transform: 'scale(1.1)' },
              transition: 'all 0.3s ease',
              '&.Mui-disabled': { color: 'rgba(0, 245, 212, 0.3)' },
            }}
          >
            <Forward30Icon />
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
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
          {!isIOS ? (
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
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VolumeUpIcon sx={{ color: 'rgba(251, 248, 204, 0.5)', fontSize: 20 }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(251, 248, 204, 0.7)',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                }}
              >
                デバイスの音量ボタンを使用
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
