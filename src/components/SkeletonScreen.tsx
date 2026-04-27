// MUI コンポーネントを個別インポート（バンドルサイズ最適化）
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { motion } from "framer-motion";

/**
 * レトロフューチャーなデザインのスケルトンスクリーンコンポーネント
 * ドハティの法則（400ms以下の応答時間）に基づいて体感速度を向上
 */

interface MusicListSkeletonProps {
  count?: number;
}

/**
 * 音楽リスト用のスケルトンスクリーン
 * ネオングロー効果とシマーアニメーションを持つ
 */
export const MusicListSkeleton: React.FC<MusicListSkeletonProps> = ({ count = 5 }) => {
  return (
    <Box sx={{ mt: 3, minHeight: "60vh" }}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.15,
            ease: "easeOut",
          }}
        >
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: "12px",
              background: "rgba(42, 10, 77, 0.6)",
              border: "1px solid rgba(255, 0, 110, 0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255, 0, 110, 0.1), rgba(0, 245, 212, 0.1), transparent)",
                animation: "shimmer 2s infinite",
              },
              "@keyframes shimmer": {
                "0%": { left: "-100%" },
                "100%": { left: "100%" },
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              {/* アイコンスケルトン */}
              <Skeleton
                variant="rounded"
                width={48}
                height={48}
                sx={{
                  mr: 2,
                  bgcolor: "rgba(255, 0, 110, 0.2)",
                  borderRadius: "8px",
                  animation: "pulse 1.5s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%, 100%": {
                      opacity: 0.4,
                      boxShadow: "0 0 5px rgba(255, 0, 110, 0.3)",
                    },
                    "50%": {
                      opacity: 0.7,
                      boxShadow: "0 0 15px rgba(255, 0, 110, 0.5)",
                    },
                  },
                }}
              />
              {/* テキストスケルトン */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton
                  variant="text"
                  width="70%"
                  height={24}
                  sx={{
                    bgcolor: "rgba(0, 245, 212, 0.15)",
                    animation: "glow 1.5s ease-in-out infinite",
                    "@keyframes glow": {
                      "0%, 100%": {
                        opacity: 0.3,
                      },
                      "50%": {
                        opacity: 0.6,
                      },
                    },
                  }}
                />
              </Box>
            </Box>
            {/* 共有ボタンスケルトン */}
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              sx={{
                bgcolor: "rgba(0, 245, 212, 0.15)",
                animation: "glow 1.5s ease-in-out infinite",
              }}
            />
          </Box>
        </motion.div>
      ))}
    </Box>
  );
};

/**
 * 曲切り替え時のインラインローディング表示
 * より目立つネオングロー効果を持つ
 */
export const TrackSwitchingIndicator: React.FC = () => {
  const fireflies = [
    { x: [0, 8, -6, 0], y: [0, -10, -4, 0], delay: 0, duration: 2.2 },
    { x: [0, -7, 10, 0], y: [0, -6, -12, 0], delay: 0.35, duration: 2.6 },
    { x: [0, 5, -8, 0], y: [0, -12, -8, 0], delay: 0.7, duration: 2.4 },
  ];

  return (
    <Box
      sx={{
        position: "relative",
        width: 36,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        component={motion.div}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        sx={{
          position: "absolute",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 248, 184, 0.95) 0%, rgba(255, 206, 84, 0.8) 45%, rgba(255, 206, 84, 0) 75%)",
          filter: "blur(0.4px)",
          boxShadow: "0 0 14px rgba(255, 214, 102, 0.75), 0 0 28px rgba(255, 214, 102, 0.35)",
          animation: "fireflyPulse 1.2s ease-in-out infinite",
          "@keyframes fireflyPulse": {
            "0%, 100%": {
              transform: "scale(0.75)",
              opacity: 0.45,
            },
            "50%": {
              transform: "scale(1)",
              opacity: 1,
            },
          },
        }}
      />
      {fireflies.map((firefly, index) => (
        <Box
          key={index}
          component={motion.div}
          animate={{
            x: firefly.x,
            y: firefly.y,
            opacity: [0.2, 1, 0.35, 1, 0.2],
            scale: [0.7, 1, 0.8, 1, 0.7],
          }}
          transition={{
            duration: firefly.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: firefly.delay,
          }}
          sx={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#fff6a3",
            boxShadow: "0 0 10px rgba(255, 246, 163, 0.95), 0 0 18px rgba(255, 210, 90, 0.45)",
          }}
        />
      ))}
      <Box
        component={motion.div}
        animate={{ opacity: [0.18, 0.4, 0.18], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: "999px",
          border: "1px solid rgba(255, 230, 130, 0.25)",
          boxShadow: "0 0 18px rgba(255, 230, 130, 0.12)",
          pointerEvents: "none",
          transformOrigin: "center",
        }}
      />
    </Box>
  );
};

/**
 * 蛍のローディングアニメーション
 * ふわふわと飛び回り、点滅しながら光る蛍をイメージ
 */
export const RetroLoadingSpinner: React.FC<{ size?: number }> = () => {
  // 蛍の個体データ
  const fireflies = [
    { delay: 0, x: [0, 30, -20, 10, 0], y: [0, -25, -15, -30, 0], duration: 4 },
    { delay: 0.5, x: [0, -25, 15, -10, 0], y: [0, -20, -35, -15, 0], duration: 4.5 },
    { delay: 1, x: [0, 20, -30, 5, 0], y: [0, -30, -10, -25, 0], duration: 5 },
    { delay: 1.5, x: [0, -15, 25, -5, 0], y: [0, -15, -25, -35, 0], duration: 4.2 },
  ];

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
      }}
    >
      {/* 蛍たちが飛び回るコンテナ */}
      <Box
        sx={{
          position: "relative",
          width: { xs: 120, sm: 150 },
          height: { xs: 120, sm: 150 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {fireflies.map((firefly, index) => (
          <Box
            key={index}
            component={motion.div}
            animate={{
              x: firefly.x,
              y: firefly.y,
              opacity: [0.3, 1, 0.3, 1, 0.3], // 点滅効果
            }}
            transition={{
              x: {
                duration: firefly.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: firefly.delay,
              },
              y: {
                duration: firefly.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: firefly.delay,
              },
              opacity: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: firefly.delay,
              },
            }}
            sx={{
              position: "absolute",
              width: { xs: 8, sm: 10 },
              height: { xs: 8, sm: 10 },
              borderRadius: "50%",
              background: "radial-gradient(circle, #ffeb3b, #ffc107)",
              boxShadow: {
                xs: "0 0 15px rgba(255, 235, 59, 0.8), 0 0 30px rgba(255, 193, 7, 0.6)",
                sm: "0 0 20px rgba(255, 235, 59, 0.9), 0 0 40px rgba(255, 193, 7, 0.7)",
              },
              filter: "blur(1px)",
              "&::after": {
                content: '""',
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "150%",
                height: "150%",
                borderRadius: "50%",
                background: "rgba(255, 235, 59, 0.2)",
                boxShadow: "0 0 10px rgba(255, 235, 59, 0.4)",
              },
            }}
          />
        ))}
      </Box>

      {/* ローディングテキスト */}
      <Box
        component={motion.div}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        sx={{
          mt: { xs: 3, sm: 4 },
          color: "#ffeb3b",
          fontFamily: "Orbitron, sans-serif",
          fontSize: { xs: "0.9rem", sm: "1.1rem" },
          letterSpacing: "0.1em",
          textShadow: "0 0 10px rgba(255, 235, 59, 0.5)",
        }}
      >
        Loading...
      </Box>
    </Box>
  );
};
