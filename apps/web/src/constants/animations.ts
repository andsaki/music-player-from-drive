import type { Variants } from 'framer-motion';

// 共通トランジション設定
export const TRANSITIONS = {
  default: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1], // Material Design easing
  },
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  slow: {
    duration: 0.6,
    ease: [0.4, 0, 0.2, 1],
  },
};

// リストアイテムのアニメーション
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// タスクアイテムのアニメーション（MemoModal用）
export const taskItemVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

// モーダルのアニメーション
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

// 現在再生中の曲の強調アニメーション
export const playingIndicatorVariants: Variants = {
  idle: {
    borderColor: 'transparent',
    boxShadow: 'none',
  },
  playing: {
    borderColor: '#ff006e',
    boxShadow: '0 0 20px rgba(255, 0, 110, 0.6)',
    borderLeftWidth: '4px',
  },
};

// ネオンパルスアニメーション
export const neonPulseVariants: Variants = {
  initial: {
    boxShadow: '0 0 10px rgba(255, 0, 110, 0.5)',
  },
  animate: {
    boxShadow: [
      '0 0 10px rgba(255, 0, 110, 0.5)',
      '0 0 25px rgba(255, 0, 110, 0.8)',
      '0 0 10px rgba(255, 0, 110, 0.5)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
