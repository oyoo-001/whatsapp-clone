const cssVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const root = document.documentElement;
  if (root) {
    const val = getComputedStyle(root).getPropertyValue(name).trim();
    return val || fallback;
  }
  return fallback;
};

export const Colors = {
  primary: '#075E54',
  primaryDark: '#054D44',
  primaryLight: '#128C7E',
  secondary: '#25D366',
  accent: '#34B7F1',
  white: '#FFFFFF',
  black: '#000000',
  grey: '#667781',
  get lightGrey() { return cssVar('--lightGrey', '#E9EDEF'); },
  get lighterGrey() { return cssVar('--lighterGrey', '#F0F2F5'); },
  get darkGrey() { return '#3B4A54'; },
  red: '#E53935',
  get chatBg() { return cssVar('--chatBg', '#ECE5DD'); },
  get receivedMsg() { return cssVar('--received', '#FFFFFF'); },
  get sentMsg() { return cssVar('--sent', '#D9FDD3'); },
  get border() { return cssVar('--border', '#E9EDEF'); },
  get textPrimary() { return cssVar('--textPrimary', '#111B21'); },
  get textSecondary() { return cssVar('--textSecondary', '#667781'); },
  get textHint() { return cssVar('--textHint', '#8696A0'); },
  online: '#4CAF50',
  overlay: 'rgba(0,0,0,0.5)',
  get inputBg() { return cssVar('--inputBg', '#F0F2F5'); },
};

export const Fonts = {
  sizes: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24 },
};

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
