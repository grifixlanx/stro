import { ThemeColor } from '../types';

export interface ThemeConfig {
  id: ThemeColor;
  name: string;
  primary: string; // Hex for canvas and accents
  primaryGlow: string;
  bgDark: string;
  cardBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  buttonBg: string;
  buttonHover: string;
}

export const THEMES: Record<ThemeColor, ThemeConfig> = {
  red: {
    id: 'red',
    name: 'Crimson Sonar',
    primary: '#ef4444',
    primaryGlow: 'rgba(239, 68, 68, 0.4)',
    bgDark: '#070204',
    cardBg: '#120306',
    border: '#7f1d1d',
    textPrimary: '#fecaca',
    textSecondary: '#ef4444',
    buttonBg: '#dc2626',
    buttonHover: '#b91c1c',
  },
  cyan: {
    id: 'cyan',
    name: 'Abyssal Cyan',
    primary: '#06b6d4',
    primaryGlow: 'rgba(6, 182, 212, 0.4)',
    bgDark: '#02090e',
    cardBg: '#051622',
    border: '#155e75',
    textPrimary: '#cffafe',
    textSecondary: '#06b6d4',
    buttonBg: '#0891b2',
    buttonHover: '#0e7490',
  },
  green: {
    id: 'green',
    name: 'Tactical Radar',
    primary: '#22c55e',
    primaryGlow: 'rgba(34, 197, 94, 0.4)',
    bgDark: '#020a04',
    cardBg: '#05180a',
    border: '#166534',
    textPrimary: '#dcfce7',
    textSecondary: '#22c55e',
    buttonBg: '#16a34a',
    buttonHover: '#15803d',
  },
  amber: {
    id: 'amber',
    name: 'Naval Amber',
    primary: '#f59e0b',
    primaryGlow: 'rgba(245, 158, 11, 0.4)',
    bgDark: '#0a0602',
    cardBg: '#1a1005',
    border: '#78350f',
    textPrimary: '#fef3c7',
    textSecondary: '#f59e0b',
    buttonBg: '#d97706',
    buttonHover: '#b45309',
  },
  purple: {
    id: 'purple',
    name: 'Sub-Zero Violet',
    primary: '#a855f7',
    primaryGlow: 'rgba(168, 85, 247, 0.4)',
    bgDark: '#08020c',
    cardBg: '#150622',
    border: '#581c87',
    textPrimary: '#f3e8ff',
    textSecondary: '#a855f7',
    buttonBg: '#9333ea',
    buttonHover: '#7e22ce',
  },
};
