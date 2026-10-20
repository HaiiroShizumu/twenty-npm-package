/* oxlint-disable twenty/no-hardcoded-colors */
import { type SkinThemeMode } from '../types/SkinThemeMode';

// Must match the light/dark palette blocks in skin.css
export const SKIN_THEME_PALETTE: Record<
  SkinThemeMode,
  { canvas: string; surface: string; ink: string; inkMuted: string }
> = {
  light: {
    canvas: '#f4f4f5',
    surface: '#ffffff',
    ink: '#09090b',
    inkMuted: '#52525b',
  },
  dark: {
    canvas: '#121212',
    surface: '#1e1e1e',
    ink: '#fafafa',
    inkMuted: '#a1a1aa',
  },
};
