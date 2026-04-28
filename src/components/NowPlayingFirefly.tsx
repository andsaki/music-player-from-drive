import Box from "@mui/material/Box";
import { motion } from "framer-motion";

interface NowPlayingFireflyProps {
  loading?: boolean;
}

const fireflies = [
  { x: [0, 9, -7, 4, 0], y: [0, -10, -4, -12, 0], delay: 0, duration: 2.6 },
  { x: [0, -8, 8, -3, 0], y: [0, -5, -13, -7, 0], delay: 0.32, duration: 3 },
  { x: [0, 5, -10, 7, 0], y: [0, -13, -8, -4, 0], delay: 0.64, duration: 2.8 },
];

const equalizerBars = [
  { height: [9, 22, 13, 28, 10], delay: 0 },
  { height: [18, 10, 30, 15, 23], delay: 0.12 },
  { height: [12, 26, 14, 20, 11], delay: 0.24 },
  { height: [24, 14, 21, 9, 27], delay: 0.36 },
];

export const NowPlayingFirefly: React.FC<NowPlayingFireflyProps> = ({ loading = false }) => (
  <Box
    component={motion.div}
    aria-label={loading ? "曲を読み込み中" : "再生中"}
    initial={{ scale: 0.92, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    sx={{
      position: "relative",
      width: 48,
      height: 48,
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background:
        "radial-gradient(circle at 50% 38%, rgba(255, 249, 179, 0.32), transparent 34%), linear-gradient(135deg, rgba(255, 0, 110, 0.92), rgba(0, 245, 212, 0.62))",
      boxShadow:
        "0 0 18px rgba(255, 0, 110, 0.62), 0 0 26px rgba(0, 245, 212, 0.34), inset 0 0 16px rgba(255, 255, 255, 0.16)",
      isolation: "isolate",
    }}
  >
    <Box
      component={motion.div}
      animate={{ rotate: 360, scale: loading ? [0.9, 1.08, 0.9] : [1, 1.04, 1] }}
      transition={{
        rotate: { duration: loading ? 1.8 : 4.8, repeat: Infinity, ease: "linear" },
        scale: { duration: loading ? 1 : 2.2, repeat: Infinity, ease: "easeInOut" },
      }}
      sx={{
        position: "absolute",
        inset: 5,
        borderRadius: "50%",
        border: "1px solid rgba(255, 246, 163, 0.58)",
        borderTopColor: "rgba(255, 255, 255, 0)",
        boxShadow: "0 0 16px rgba(255, 246, 163, 0.3)",
      }}
    />
    {fireflies.map((firefly, index) => (
      <Box
        key={index}
        component={motion.div}
        animate={{
          x: firefly.x,
          y: firefly.y,
          opacity: [0.18, 1, 0.38, 0.9, 0.18],
          scale: loading ? [0.7, 1.28, 0.8, 1.08, 0.7] : [0.65, 1, 0.74, 0.95, 0.65],
        }}
        transition={{
          duration: loading ? firefly.duration * 0.72 : firefly.duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: firefly.delay,
        }}
        sx={{
          position: "absolute",
          width: index === 1 ? 7 : 6,
          height: index === 1 ? 7 : 6,
          borderRadius: "50%",
          background: "#fff6a3",
          boxShadow: "0 0 10px rgba(255, 246, 163, 0.95), 0 0 20px rgba(255, 210, 90, 0.5)",
          zIndex: 1,
        }}
      />
    ))}
    <Box
      sx={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "end",
        gap: "3px",
        height: 30,
      }}
    >
      {equalizerBars.map((bar, index) => (
        <Box
          key={index}
          component={motion.div}
          animate={{ height: bar.height }}
          transition={{
            duration: loading ? 0.58 : 0.92,
            repeat: Infinity,
            ease: "easeInOut",
            delay: bar.delay,
          }}
          sx={{
            width: 4,
            borderRadius: "999px",
            background: "linear-gradient(180deg, #fffde3 0%, #fff06f 42%, #00f5d4 100%)",
            boxShadow: "0 0 8px rgba(255, 246, 163, 0.75)",
          }}
        />
      ))}
    </Box>
    <Box
      component={motion.div}
      animate={{ opacity: loading ? [0.16, 0.46, 0.16] : [0.08, 0.24, 0.08] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      sx={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(120deg, transparent 18%, rgba(255, 255, 255, 0.5) 50%, transparent 82%)",
        mixBlendMode: "screen",
      }}
    />
  </Box>
);
