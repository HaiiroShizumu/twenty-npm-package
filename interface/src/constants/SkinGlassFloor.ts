import { type SkinThemeMode } from '../types/SkinThemeMode';

// Must match --smb-glass-floor and --smb-glass-backdrop-brightness in skin.css
export const SKIN_GLASS_FLOOR: Record<SkinThemeMode, number> = {
  light: 0.5,
  dark: 0.38,
};

export const SKIN_GLASS_BACKDROP_BRIGHTNESS: Record<SkinThemeMode, number> = {
  light: 1.15,
  dark: 0.75,
};
