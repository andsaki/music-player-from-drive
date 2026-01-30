import { Box, Skeleton } from "@mui/material";
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
    <Box sx={{ mt: 3 }}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{
            delay: index * 0.04,
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
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
  return (
    <Box
      component={motion.div}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      sx={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "2px solid #ff006e",
        borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite",
        boxShadow: "0 0 15px rgba(255, 0, 110, 0.6)",
        "@keyframes spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      }}
    />
  );
};

/**
 * カスタムローディングスピナー（レトロフューチャーデザイン）
 */
export const RetroLoadingSpinner: React.FC<{ size?: number }> = ({ size = 60 }) => {
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
        mt: 8,
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "#ff006e",
          borderRightColor: "#00f5d4",
          animation: "spin 1s linear infinite",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "#00f5d4",
            borderLeftColor: "#ff006e",
            animation: "spin 1.5s linear infinite reverse",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 0, 110, 0.3), transparent)",
            boxShadow: "0 0 20px rgba(255, 0, 110, 0.5), 0 0 40px rgba(0, 245, 212, 0.3)",
            animation: "pulse 2s ease-in-out infinite",
          },
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" },
          },
          "@keyframes pulse": {
            "0%, 100%": { opacity: 0.4, transform: "translate(-50%, -50%) scale(0.9)" },
            "50%": { opacity: 1, transform: "translate(-50%, -50%) scale(1.1)" },
          },
        }}
      />
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
          mt: 3,
          color: "#00f5d4",
          fontFamily: "Orbitron, sans-serif",
          fontSize: "1.1rem",
          letterSpacing: "0.1em",
          textShadow: "0 0 10px rgba(0, 245, 212, 0.5)",
        }}
      >
        Loading...
      </Box>
    </Box>
  );
};
