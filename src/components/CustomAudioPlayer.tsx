import React, { useState, useEffect, useRef } from "react";
// MUI コンポーネントを個別インポート（バンドルサイズ最適化）
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
// MUI アイコン（すでに個別インポート）
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import RepeatIcon from "@mui/icons-material/Repeat";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import Replay10Icon from "@mui/icons-material/Replay10";
import Replay30Icon from "@mui/icons-material/Replay30";
import Forward10Icon from "@mui/icons-material/Forward10";
import Forward30Icon from "@mui/icons-material/Forward30";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { NowPlayingFirefly } from "./NowPlayingFirefly";

const DRAG_VISUAL_LIMIT = 140;
const DRAG_TOGGLE_THRESHOLD = 60;
const DRAG_FLICK_VELOCITY = 650; // px per second needed to toggle without covering the full distance
const clampDragOffset = (value: number, expanded: boolean) =>
  expanded
    ? Math.min(DRAG_VISUAL_LIMIT, Math.max(0, value))
    : Math.max(-DRAG_VISUAL_LIMIT, Math.min(0, value));
const getNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const waveformBars = [16, 28, 18, 34, 22, 40, 26, 18, 32, 20, 36, 24, 30, 18, 28, 22];

const LiveWaveform: React.FC<{ compact?: boolean; loading?: boolean }> = ({
  compact = false,
  loading = false,
}) => (
  <Box
    aria-hidden
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: compact ? "3px" : "5px",
      height: compact ? 18 : 36,
      width: compact ? { xs: 46, sm: 78 } : { xs: 180, sm: 260 },
      mt: compact ? 0 : 1.5,
      px: compact ? 0 : 2,
      opacity: loading ? 0.95 : 0.78,
      overflow: "hidden",
    }}
  >
    {waveformBars.map((height, index) => (
      <Box
        key={index}
        component={motion.div}
        animate={{
          height: [
            Math.max(4, height * (compact ? 0.22 : 0.38)),
            height * (compact ? 0.42 : 0.82),
            Math.max(5, height * (compact ? 0.3 : 0.5)),
          ],
          opacity: [0.35, 1, 0.5],
        }}
        transition={{
          duration: loading ? 0.48 : 0.9 + (index % 4) * 0.08,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.045,
        }}
        sx={{
          width: compact ? 2 : 4,
          borderRadius: "999px",
          background:
            index % 3 === 0
              ? "linear-gradient(180deg, #fbf8cc, #ff006e)"
              : "linear-gradient(180deg, #fbf8cc, #00f5d4)",
          boxShadow: compact
            ? "0 0 6px rgba(251, 248, 204, 0.36)"
            : "0 0 12px rgba(251, 248, 204, 0.42), 0 0 18px rgba(0, 245, 212, 0.18)",
        }}
      />
    ))}
  </Box>
);

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const dragVelocityRef = useRef(0);
  const lastDragPointRef = useRef({ y: 0, time: 0 });
  const dragOffset = useMotionValue(0);
  const animatedDragOffset = useSpring(dragOffset, { stiffness: 360, damping: 40 });
  const gapOverlayHeight = useTransform(animatedDragOffset, (value) => Math.max(0, -value));

  // iOSを検出（MSStreamはIE11のUser Agent判定用）
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
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
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const shouldIgnoreDragTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && target.closest('[data-skip-player-drag="true"]');

  const beginDrag = (clientY: number) => {
    setIsDragging(true);
    setDragStartY(clientY);
    dragVelocityRef.current = 0;
    lastDragPointRef.current = { y: clientY, time: getNow() };
  };

  const updateDrag = (clientY: number) => {
    if (!isDragging) return;

    const now = getNow();
    const { y: lastY, time: lastTime } = lastDragPointRef.current;
    const deltaSinceLast = clientY - lastY;
    const timeSinceLast = now - lastTime;
    if (timeSinceLast > 0) {
      dragVelocityRef.current = (deltaSinceLast / timeSinceLast) * 1000;
    }
    lastDragPointRef.current = { y: clientY, time: now };

    const deltaY = clientY - dragStartY;
    dragOffset.set(clampDragOffset(deltaY, isExpanded));
  };

  const finishDrag = (clientY: number) => {
    if (!isDragging) return;
    const deltaY = clientY - dragStartY;
    const velocity = dragVelocityRef.current;

    if (!isExpanded && (deltaY <= -DRAG_TOGGLE_THRESHOLD || velocity <= -DRAG_FLICK_VELOCITY)) {
      setIsExpanded(true);
    } else if (isExpanded && (deltaY >= DRAG_TOGGLE_THRESHOLD || velocity >= DRAG_FLICK_VELOCITY)) {
      setIsExpanded(false);
    }

    setIsDragging(false);
    dragVelocityRef.current = 0;
    dragOffset.set(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (shouldIgnoreDragTarget(e.target)) return;
    beginDrag(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    updateDrag(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    finishDrag(e.changedTouches[0].clientY);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (shouldIgnoreDragTarget(e.target)) return;
    if (e.pointerType !== "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    beginDrag(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (e.pointerType !== "mouse") return;
    e.preventDefault();
    updateDrag(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (e.pointerType !== "mouse") return;
    e.preventDefault();
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    finishDrag(e.clientY);
  };

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
    dragOffset.set(0);
  };

  if (!selectedFile) return null;

  return (
    <>
      <Box
        component={motion.div}
        style={{ y: animatedDragOffset }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          height: isExpanded ? "100vh" : "auto",
          top: isExpanded ? 0 : "auto",
          boxShadow: isLoading
            ? [
                "0 -4px 30px rgba(255, 0, 110, 0.4)",
                "0 -4px 40px rgba(255, 0, 110, 0.6), 0 -8px 60px rgba(0, 245, 212, 0.4)",
                "0 -4px 30px rgba(255, 0, 110, 0.4)",
              ]
            : "0 -4px 30px rgba(255, 0, 110, 0.4)",
        }}
        transition={{
          height: { duration: 0.3, ease: "easeInOut" },
          top: { duration: 0.3, ease: "easeInOut" },
          boxShadow: {
            duration: 1.5,
            repeat: isLoading ? Infinity : 0,
            ease: "easeInOut",
          },
        }}
        sx={{
          position: "fixed",
          bottom: isExpanded ? "auto" : 0,
          left: 0,
          right: 0,
          background: "linear-gradient(180deg, rgba(26,0,51,0.95) 0%, rgba(61,0,102,0.98) 100%)",
          backdropFilter: "blur(10px)",
          borderTop: "2px solid",
          borderImage: "linear-gradient(90deg, #ff006e, #00f5d4, #fbf8cc) 1",
          pt: isExpanded ? "calc(env(safe-area-inset-top) + 16px)" : 3,
          px: { xs: 1.5, sm: 3 },
          pb: "calc(24px + env(safe-area-inset-bottom))",
          zIndex: 1100,
          overflow: isExpanded ? "auto" : "visible",
          display: "flex",
          flexDirection: "column",
          touchAction: isExpanded ? "auto" : "none",
          isolation: "isolate",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 0%, rgba(0, 245, 212, 0.14), transparent 32%), radial-gradient(circle at 82% 18%, rgba(255, 0, 110, 0.16), transparent 34%), linear-gradient(100deg, transparent 0%, rgba(251, 248, 204, 0.06) 48%, transparent 56%)",
            opacity: isPlaying || isLoading ? 1 : 0.56,
            animation: "playerAmbientDrift 7s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 0,
            "@keyframes playerAmbientDrift": {
              "0%, 100%": { transform: "translate3d(-2%, 0, 0) scale(1)" },
              "50%": { transform: "translate3d(2%, -1%, 0) scale(1.04)" },
            },
          },
        }}
      >
        {/* ドラッグハンドル */}
        <Box
          onClick={toggleExpanded}
          data-player-handle="true"
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 1,
            cursor: "pointer",
            "&:hover .drag-indicator": {
              background: "linear-gradient(90deg, #ff006e, #00f5d4)",
              boxShadow: "0 0 10px rgba(255, 0, 110, 0.6)",
            },
          }}
        >
          <Box
            className="drag-indicator"
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(255, 255, 255, 0.3)",
              transition: "all 0.3s ease",
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
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 4,
            }}
          >
            {isPlaying || isLoading ? (
              <Box sx={{ mb: 4 }}>
                <NowPlayingFirefly variant="hero" loading={isLoading} />
              </Box>
            ) : (
              <Box
                sx={{
                  width: { xs: 250, sm: 300 },
                  height: { xs: 250, sm: 300 },
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #ff006e, #ff4d9f, #00f5d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 4,
                  boxShadow: "0 0 40px rgba(255, 0, 110, 0.6), 0 0 80px rgba(0, 245, 212, 0.3)",
                }}
              >
                <VolumeUpIcon sx={{ fontSize: { xs: 120, sm: 150 }, color: "#fff" }} />
              </Box>
            )}
            <Typography
              variant="h4"
              component={motion.div}
              animate={
                isLoading
                  ? {
                      opacity: [0.5, 1, 0.5],
                    }
                  : { opacity: 1 }
              }
              transition={{
                duration: 1.5,
                repeat: isLoading ? Infinity : 0,
                ease: "easeInOut",
              }}
              sx={{
                mb: 1,
                textAlign: "center",
                background: "linear-gradient(90deg, #ff006e, #00f5d4)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "Orbitron, sans-serif",
                fontWeight: 700,
                px: 2,
                filter: isLoading ? "blur(1px)" : "blur(0)",
                transition: "filter 0.3s ease",
              }}
            >
              {selectedFile.name}
            </Typography>
            {(isPlaying || isLoading) && <LiveWaveform loading={isLoading} />}
          </Box>
        )}

        {/* 縮小時のコンパクトビュー */}
        {!isExpanded && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.25,
              mb: 2,
              minWidth: 0,
            }}
          >
            {(isPlaying || isLoading) && <NowPlayingFirefly loading={isLoading} />}
            <Typography
              variant="h6"
              component={motion.div}
              animate={
                isLoading
                  ? {
                      opacity: [0.5, 1, 0.5],
                    }
                  : { opacity: 1 }
              }
              transition={{
                duration: 1.5,
                repeat: isLoading ? Infinity : 0,
                ease: "easeInOut",
              }}
              sx={{
                textAlign: "center",
                background: "linear-gradient(90deg, #ff006e, #00f5d4)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "Orbitron, sans-serif",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                filter: isLoading ? "blur(1px)" : "blur(0)",
                transition: "filter 0.3s ease",
              }}
            >
              {selectedFile.name}
            </Typography>
            {(isPlaying || isLoading) && <LiveWaveform compact loading={isLoading} />}
          </Box>
        )}

        {/* シークバー */}
        <Box sx={{ mb: 2 }} data-skip-player-drag="true">
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleSeek}
            sx={{
              color: "#ff006e",
              height: 6,
              "& .MuiSlider-thumb": {
                width: 16,
                height: 16,
                boxShadow: "0 0 15px rgba(255, 0, 110, 0.8)",
                animation: isPlaying ? "seekThumbPulse 1.6s ease-in-out infinite" : "none",
                transition: "all 0.2s",
                "&:hover": {
                  boxShadow: "0 0 20px rgba(255, 0, 110, 1)",
                },
              },
              "& .MuiSlider-track": {
                background: "linear-gradient(90deg, #ff006e, #00f5d4)",
                boxShadow: "0 0 10px rgba(255, 0, 110, 0.5)",
              },
              "& .MuiSlider-rail": {
                opacity: 0.3,
              },
              "@keyframes seekThumbPulse": {
                "0%, 100%": { boxShadow: "0 0 12px rgba(255, 0, 110, 0.72)" },
                "50%": {
                  boxShadow: "0 0 22px rgba(255, 0, 110, 0.95), 0 0 28px rgba(0, 245, 212, 0.36)",
                },
              },
            }}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>

        {/* コントロールボタン */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: { xs: 1, sm: 2 },
            flexWrap: "wrap",
          }}
          data-skip-player-drag={isExpanded ? "true" : undefined}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 2 } }}>
            <IconButton
              onClick={onPrevious}
              disabled={!onPrevious}
              sx={{
                color: "#00f5d4",
                "&:hover": { color: "#33f7de", transform: "scale(1.1)" },
                transition: "all 0.3s ease",
                "&.Mui-disabled": { color: "rgba(0, 245, 212, 0.3)" },
              }}
            >
              <SkipPreviousIcon fontSize="large" />
            </IconButton>

            <IconButton
              onClick={() => handleSkipBackward(30)}
              disabled={!selectedFile || duration === 0}
              sx={{
                color: "#00f5d4",
                "&:hover": { color: "#33f7de", transform: "scale(1.1)" },
                transition: "all 0.3s ease",
                "&.Mui-disabled": { color: "rgba(0, 245, 212, 0.3)" },
              }}
            >
              <Replay30Icon />
            </IconButton>

            <IconButton
              onClick={() => handleSkipBackward(10)}
              disabled={!selectedFile || duration === 0}
              sx={{
                color: "#00f5d4",
                "&:hover": { color: "#33f7de", transform: "scale(1.1)" },
                transition: "all 0.3s ease",
                "&.Mui-disabled": { color: "rgba(0, 245, 212, 0.3)" },
              }}
            >
              <Replay10Icon />
            </IconButton>

            <IconButton
              onClick={handlePlayPause}
              sx={{
                width: { xs: 56, sm: 64 },
                height: { xs: 56, sm: 64 },
                background: "linear-gradient(135deg, #ff006e, #ff4d9f)",
                boxShadow: "0 0 25px rgba(255, 0, 110, 0.6)",
                color: "#fff",
                animation: isPlaying ? "playButtonBreath 1.35s ease-in-out infinite" : "none",
                "&:hover": {
                  background: "linear-gradient(135deg, #ff4d9f, #ff006e)",
                  boxShadow: "0 0 35px rgba(255, 0, 110, 0.9)",
                  transform: "scale(1.1)",
                },
                "@keyframes playButtonBreath": {
                  "0%, 100%": {
                    boxShadow: "0 0 22px rgba(255, 0, 110, 0.58), 0 0 34px rgba(0, 245, 212, 0.18)",
                  },
                  "50%": {
                    boxShadow: "0 0 34px rgba(255, 0, 110, 0.86), 0 0 54px rgba(0, 245, 212, 0.34)",
                  },
                },
                transition: "all 0.3s ease",
              }}
            >
              {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
            </IconButton>

            <IconButton
              onClick={() => handleSkipForward(10)}
              disabled={!selectedFile || duration === 0}
              sx={{
                color: "#00f5d4",
                "&:hover": { color: "#33f7de", transform: "scale(1.1)" },
                transition: "all 0.3s ease",
                "&.Mui-disabled": { color: "rgba(0, 245, 212, 0.3)" },
              }}
            >
              <Forward10Icon />
            </IconButton>

            <IconButton
              onClick={() => handleSkipForward(30)}
              disabled={!selectedFile || duration === 0}
              sx={{
                color: "#00f5d4",
                "&:hover": { color: "#33f7de", transform: "scale(1.1)" },
                transition: "all 0.3s ease",
                "&.Mui-disabled": { color: "rgba(0, 245, 212, 0.3)" },
              }}
            >
              <Forward30Icon />
            </IconButton>

            <IconButton
              onClick={onNext}
              disabled={!onNext}
              sx={{
                color: "#00f5d4",
                "&:hover": { color: "#33f7de", transform: "scale(1.1)" },
                transition: "all 0.3s ease",
                "&.Mui-disabled": { color: "rgba(0, 245, 212, 0.3)" },
              }}
            >
              <SkipNextIcon fontSize="large" />
            </IconButton>
          </Box>

          {/* 再生モードとボリューム */}
          <Box
            sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}
            data-skip-player-drag={isExpanded ? "true" : undefined}
          >
            <IconButton
              onClick={onTogglePlayMode}
              sx={{
                color: playMode === "none" ? "rgba(251, 248, 204, 0.5)" : "#fbf8cc",
                "&:hover": { color: "#ffffff", transform: "scale(1.1)" },
                transition: "all 0.3s ease",
              }}
            >
              {playMode === "repeat-all" && <RepeatIcon />}
              {playMode === "repeat-one" && <RepeatOneIcon />}
              {playMode === "none" && <RepeatIcon />}
            </IconButton>

            {!isIOS ? (
              <Box
                sx={{ display: "flex", alignItems: "center", minWidth: 150 }}
                data-skip-player-drag="true"
              >
                <IconButton
                  onClick={toggleMute}
                  sx={{
                    color: "#fbf8cc",
                    "&:hover": { color: "#ffffff", transform: "scale(1.1)" },
                    transition: "all 0.3s ease",
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
                    color: "#fbf8cc",
                    ml: 1,
                    "& .MuiSlider-thumb": {
                      boxShadow: "0 0 10px rgba(251, 248, 204, 0.6)",
                      "&:hover": {
                        boxShadow: "0 0 15px rgba(251, 248, 204, 0.9)",
                      },
                    },
                    "& .MuiSlider-track": {
                      boxShadow: "0 0 5px rgba(251, 248, 204, 0.4)",
                    },
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <VolumeUpIcon sx={{ color: "rgba(251, 248, 204, 0.5)", fontSize: 20 }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(251, 248, 204, 0.7)",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  デバイスの音量ボタンを使用
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      <Box
        component={motion.div}
        aria-hidden
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(180deg, rgba(26,0,51,0.95) 0%, rgba(61,0,102,0.98) 100%)",
          pointerEvents: "none",
          zIndex: 1000,
        }}
        style={{ height: gapOverlayHeight }}
      />
    </>
  );
};
