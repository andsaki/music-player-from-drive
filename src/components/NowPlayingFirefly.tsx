import Box from "@mui/material/Box";
import { motion } from "framer-motion";

interface NowPlayingFireflyProps {
  loading?: boolean;
  variant?: "compact" | "hero";
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

const orbitalFireflies = [
  { size: 12, orbit: 104, duration: 7.2, delay: 0 },
  { size: 8, orbit: 82, duration: 5.8, delay: 1.1 },
  { size: 10, orbit: 122, duration: 8.4, delay: 2.2 },
];

const grooveRings = [58, 86, 116, 146, 176, 206];

export const NowPlayingFirefly: React.FC<NowPlayingFireflyProps> = ({
  loading = false,
  variant = "compact",
}) => {
  const isHero = variant === "hero";

  return (
    <Box
      component={motion.div}
      aria-label={loading ? "曲を読み込み中" : "再生中"}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      sx={{
        position: "relative",
        width: isHero ? { xs: 250, sm: 300 } : 48,
        height: isHero ? { xs: 250, sm: 300 } : 48,
        borderRadius: isHero ? "24px" : "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: isHero
          ? "radial-gradient(circle at 50% 36%, rgba(255, 250, 186, 0.38), transparent 28%), radial-gradient(circle at 18% 18%, rgba(0, 245, 212, 0.38), transparent 26%), radial-gradient(circle at 84% 78%, rgba(255, 0, 110, 0.42), transparent 28%), linear-gradient(145deg, #23002f 0%, #6b004f 48%, #002f42 100%)"
          : "radial-gradient(circle at 50% 38%, rgba(255, 249, 179, 0.32), transparent 34%), linear-gradient(135deg, rgba(255, 0, 110, 0.92), rgba(0, 245, 212, 0.62))",
        boxShadow: isHero
          ? "0 0 44px rgba(255, 0, 110, 0.64), 0 0 86px rgba(0, 245, 212, 0.34), inset 0 0 42px rgba(255, 255, 255, 0.16)"
          : "0 0 18px rgba(255, 0, 110, 0.62), 0 0 26px rgba(0, 245, 212, 0.34), inset 0 0 16px rgba(255, 255, 255, 0.16)",
        isolation: "isolate",
        "&::before": isHero
          ? {
              content: '""',
              position: "absolute",
              inset: 14,
              borderRadius: "20px",
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent 32%), repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 18px)",
              opacity: 0.5,
              maskImage: "radial-gradient(circle at center, black 42%, transparent 74%)",
              pointerEvents: "none",
            }
          : undefined,
        "&::after": isHero
          ? {
              content: '""',
              position: "absolute",
              inset: -80,
              background:
                "conic-gradient(from 90deg, transparent, rgba(0, 245, 212, 0.16), transparent, rgba(255, 0, 110, 0.16), transparent)",
              animation: "nowPlayingAurora 8s linear infinite",
              "@keyframes nowPlayingAurora": {
                to: { transform: "rotate(360deg)" },
              },
              pointerEvents: "none",
            }
          : undefined,
      }}
    >
      {isHero &&
        grooveRings.map((size, index) => (
          <Box
            key={size}
            component={motion.div}
            animate={{ opacity: [0.08, 0.22, 0.08], scale: [0.98, 1.01, 0.98] }}
            transition={{
              duration: 2.4 + index * 0.18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.12,
            }}
            sx={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: "50%",
              border: "1px solid rgba(251, 248, 204, 0.28)",
              boxShadow: "inset 0 0 10px rgba(0, 245, 212, 0.08)",
              zIndex: 1,
            }}
          />
        ))}
      {isHero &&
        orbitalFireflies.map((firefly, index) => (
          <Box
            key={index}
            component={motion.div}
            animate={{ rotate: 360 }}
            transition={{
              duration: loading ? firefly.duration * 0.7 : firefly.duration,
              repeat: Infinity,
              ease: "linear",
              delay: firefly.delay,
            }}
            sx={{
              position: "absolute",
              width: firefly.orbit,
              height: firefly.orbit,
              borderRadius: "50%",
              zIndex: 1,
            }}
          >
            <Box
              component={motion.div}
              animate={{ opacity: [0.28, 1, 0.42], scale: [0.78, 1.12, 0.78] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.25,
              }}
              sx={{
                width: firefly.size,
                height: firefly.size,
                borderRadius: "50%",
                background: "#fff8a8",
                boxShadow: "0 0 18px rgba(255, 248, 168, 0.95), 0 0 44px rgba(0, 245, 212, 0.34)",
              }}
            />
          </Box>
        ))}
      <Box
        component={motion.div}
        animate={{ rotate: 360, scale: loading ? [0.9, 1.08, 0.9] : [1, 1.04, 1] }}
        transition={{
          rotate: { duration: loading ? 1.8 : 4.8, repeat: Infinity, ease: "linear" },
          scale: { duration: loading ? 1 : 2.2, repeat: Infinity, ease: "easeInOut" },
        }}
        sx={{
          position: "absolute",
          inset: isHero ? 24 : 5,
          borderRadius: "50%",
          border: isHero
            ? "2px solid rgba(255, 246, 163, 0.46)"
            : "1px solid rgba(255, 246, 163, 0.58)",
          borderTopColor: "rgba(255, 255, 255, 0)",
          boxShadow: isHero
            ? "0 0 34px rgba(255, 246, 163, 0.24)"
            : "0 0 16px rgba(255, 246, 163, 0.3)",
        }}
      />
      {fireflies.map((firefly, index) => (
        <Box
          key={index}
          component={motion.div}
          animate={{
            x: isHero ? firefly.x.map((value) => value * 6.5) : firefly.x,
            y: isHero ? firefly.y.map((value) => value * 6.5) : firefly.y,
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
            width: isHero ? (index === 1 ? 18 : 15) : index === 1 ? 7 : 6,
            height: isHero ? (index === 1 ? 18 : 15) : index === 1 ? 7 : 6,
            borderRadius: "50%",
            background: "#fff6a3",
            boxShadow: isHero
              ? "0 0 22px rgba(255, 246, 163, 0.96), 0 0 48px rgba(255, 210, 90, 0.48)"
              : "0 0 10px rgba(255, 246, 163, 0.95), 0 0 20px rgba(255, 210, 90, 0.5)",
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
          gap: isHero ? "10px" : "3px",
          height: isHero ? { xs: 136, sm: 158 } : 30,
        }}
      >
        {equalizerBars.map((bar, index) => (
          <Box
            key={index}
            component={motion.div}
            animate={{ height: isHero ? bar.height.map((value) => value * 5) : bar.height }}
            transition={{
              duration: loading ? 0.58 : 0.92,
              repeat: Infinity,
              ease: "easeInOut",
              delay: bar.delay,
            }}
            sx={{
              width: isHero ? { xs: 12, sm: 14 } : 4,
              borderRadius: "999px",
              background: "linear-gradient(180deg, #fffde3 0%, #fff06f 42%, #00f5d4 100%)",
              boxShadow: isHero
                ? "0 0 18px rgba(255, 246, 163, 0.78)"
                : "0 0 8px rgba(255, 246, 163, 0.75)",
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
          background:
            "linear-gradient(120deg, transparent 18%, rgba(255, 255, 255, 0.5) 50%, transparent 82%)",
          mixBlendMode: "screen",
        }}
      />
      {isHero && (
        <Box
          component={motion.div}
          animate={{ opacity: [0.58, 1, 0.58] }}
          transition={{ duration: loading ? 0.9 : 2.4, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: { xs: 24, sm: 28 },
            zIndex: 3,
            color: "rgba(255, 253, 227, 0.88)",
            fontFamily: "Orbitron, sans-serif",
            fontSize: { xs: "0.68rem", sm: "0.76rem" },
            fontWeight: 700,
            letterSpacing: "0.28em",
            textAlign: "center",
            textShadow: "0 0 14px rgba(255, 246, 163, 0.62)",
          }}
        >
          NOW PLAYING
        </Box>
      )}
    </Box>
  );
};
