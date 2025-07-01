// Color Constants for MindMeetar
// This file contains all the colors used throughout the application for easy maintenance

export const COLORS = {
  // Primary Brand Colors
  primary: {
    blue600: 'blue-600',
    blue500: 'blue-500',
    blue400: 'blue-400',
    blue300: 'blue-300',
    purple600: 'purple-600',
    purple500: 'purple-500',
  },

  // Slate Color Palette (Main UI)
  slate: {
    950: 'slate-950',
    900: 'slate-900',
    800: 'slate-800',
    700: 'slate-700',
    600: 'slate-600',
    500: 'slate-500',
    400: 'slate-400',
    300: 'slate-300',
  },

  // Accent Colors
  accent: {
    red500: 'red-500',
    red400: 'red-400',
    pink600: 'pink-600',
    pink500: 'pink-500',
    green500: 'green-500',
    emerald600: 'emerald-600',
    yellow500: 'yellow-500',
    yellow400: 'yellow-400',
    yellow300: 'yellow-300',
    orange500: 'orange-500',
  },

  // Text Colors
  text: {
    white: 'white',
    slate950: 'text-slate-950',
    slate900: 'text-slate-900',
    slate800: 'text-slate-800',
    slate700: 'text-slate-700',
    slate600: 'text-slate-600',
    slate500: 'text-slate-500',
    slate400: 'text-slate-400',
    slate300: 'text-slate-300',
    blue600: 'text-blue-600',
    blue500: 'text-blue-500',
    blue400: 'text-blue-400',
    blue300: 'text-blue-300',
    red500: 'text-red-500',
    red400: 'text-red-400',
    yellow500: 'text-yellow-500',
    yellow400: 'text-yellow-400',
    yellow300: 'text-yellow-300',
  },

  // Background Colors
  background: {
    slate950: 'bg-slate-950',
    slate900: 'bg-slate-900',
    slate800: 'bg-slate-800',
    slate700: 'bg-slate-700',
    slate600: 'bg-slate-600',
    gradientPrimary: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
    gradientCard: 'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
    gradientCardDark: 'bg-gradient-to-br from-slate-800/40 to-slate-900/40',
    gradientCardLight: 'bg-gradient-to-br from-slate-800/30 to-slate-900/30',
    gradientAvatar: 'bg-gradient-to-br from-slate-700 to-slate-800',
    gradientAvatarAlt: 'bg-gradient-to-br from-slate-600 to-slate-700',
    gradientButton: 'bg-gradient-to-r from-blue-600 to-purple-600',
    gradientButtonHover: 'hover:from-blue-500 hover:to-purple-500',
    gradientUnfollow: 'bg-gradient-to-r from-red-500 to-pink-600',
    gradientUnfollowHover: 'hover:from-red-400 hover:to-pink-500',
    gradientCustomBg: 'bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60',
    gradientTabs: 'bg-gradient-to-r from-slate-800/50 to-slate-900/50',
    gradientActiveTab: 'bg-gradient-to-r from-blue-500 to-purple-500',
    gradientYellow: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
  },

  // Border Colors
  border: {
    slate700: 'border-slate-700/30',
    slate700Medium: 'border-slate-700/50',
    slate600: 'border-slate-600/30',
    slate600Medium: 'border-slate-600/50',
    slate500: 'border-slate-500/50',
    blue500: 'border-blue-500/50',
    yellow500: 'border-yellow-500/30',
  },

  // Ring Colors (for focus states, etc.)
  ring: {
    slate600Light: 'ring-slate-600/20',
    slate500Light: 'ring-slate-500/30',
  },

  // Shadow Colors
  shadow: {
    blue500: 'shadow-blue-500/25',
    blue500Light: 'shadow-blue-500/10',
    red500: 'shadow-red-500/25',
  },

  // Engagement Colors (Like, Save, Comment actions)
  engagement: {
    active: 'text-blue-500 fill-current',
    hover: 'hover:text-blue-500',
    inactive: 'text-slate-400',
    comment: 'hover:text-blue-500',
  },

  // Opacity Variants
  opacity: {
    slate800_50: 'slate-800/50',
    slate800_40: 'slate-800/40',
    slate800_30: 'slate-800/30',
    slate900_50: 'slate-900/50',
    slate900_40: 'slate-900/40',
    slate900_30: 'slate-900/30',
    slate900_60: 'slate-900/60',
    slate700_50: 'slate-700/50',
    slate700_30: 'slate-700/30',
    slate600_50: 'slate-600/50',
    slate600_30: 'slate-600/30',
    slate600_20: 'slate-600/20',
    slate500_30: 'slate-500/30',
    blue500_20: 'blue-500/20',
    blue500_25: 'blue-500/25',
    blue500_10: 'blue-500/10',
    red500_25: 'red-500/25',
    yellow500_20: 'yellow-500/20',
    orange500_20: 'orange-500/20',
  },

  // Hover States
  hover: {
    slate700: 'hover:bg-slate-700/50',
    slate700Light: 'hover:bg-slate-700/30',
    slate600: 'hover:bg-slate-600/50',
    slate500: 'hover:border-slate-500/50',
    slate300: 'hover:text-slate-300',
    blue600: 'hover:text-blue-600',
    blue500: 'hover:text-blue-500',
    blue400: 'hover:text-blue-400',
    blue300: 'hover:text-blue-300',
    blue500Border: 'hover:border-blue-500/50',
    red400: 'hover:text-red-400',
    yellow400: 'hover:text-yellow-400',
  },

  // Special UI Elements
  special: {
    loadingGradient: 'bg-gradient-to-r from-slate-700 to-slate-600',
    mainTagBg: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
    mainTagBorder: 'border-yellow-500/30',
    mainTagText: 'text-yellow-400',
    mainTagSecondary: 'text-yellow-300',
    previewOverlay: 'bg-gradient-to-t from-slate-900/20 to-transparent',
  }
} as const;

// Utility functions for common color combinations
export const getEngagementClasses = (isActive: boolean) => ({
  button: `group/action flex items-center gap-2 ${COLORS.engagement.inactive} ${COLORS.engagement.hover} transition-all duration-200`,
  icon: `w-5 h-5 transition-all duration-200 group-hover/action:scale-110 ${isActive ? COLORS.engagement.active : ''}`,
});

export const getCardClasses = () => ({
  container: `group relative ${COLORS.background.gradientCardDark} backdrop-blur-xl rounded-2xl p-5 border ${COLORS.border.slate700} shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:${COLORS.border.slate600Medium}`,
  preview: `block mb-5 h-56 border ${COLORS.border.slate700Medium} ${COLORS.hover.blue500Border} rounded-xl overflow-hidden transition-all duration-500 hover:shadow-lg hover:${COLORS.shadow.blue500Light} relative group/preview`,
});

export const getStatClasses = () => ({
  container: `text-center group cursor-pointer ${COLORS.hover.slate700Light} rounded-xl p-2 transition-all duration-200`,
  number: `text-xl font-bold text-white mb-1 transition-colors group-hover:${COLORS.text.blue400}`,
  label: `text-sm ${COLORS.text.slate400} font-medium group-hover:${COLORS.text.slate300}`,
});
