import { SxProps, Theme } from '@mui/material/styles';

/**
 * ネオングロー効果を生成
 */
export const neonGlow = (color: string, intensity: number = 1): SxProps<Theme> => ({
  boxShadow: `0 0 ${10 * intensity}px ${color}, 0 0 ${20 * intensity}px ${color}`,
});

/**
 * グラデーションテキストを生成
 */
export const gradientText = (colors: string[]): SxProps<Theme> => ({
  background: `linear-gradient(90deg, ${colors.join(', ')})`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
});

/**
 * ネオンボーダー効果
 */
export const neonBorder = (color: string, width: number = 2): SxProps<Theme> => ({
  border: `${width}px solid ${color}`,
  boxShadow: `0 0 15px ${color}, inset 0 0 15px ${color}`,
});

/**
 * ホバーリフト効果
 */
export const hoverLift: SxProps<Theme> = {
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 25px rgba(255, 0, 110, 0.4)',
  },
};

/**
 * グラスモーフィズム効果
 */
export const glassmorphism: SxProps<Theme> = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};
