import { type SkinThemeMode } from '../types/SkinThemeMode';

// A solid backdrop has to read as its theme: no dark canvas under a light theme
export const SKIN_CANVAS_LUMINANCE_RANGE: Record<
  SkinThemeMode,
  readonly [number, number]
> = {
  light: [0.55, 1],
  dark: [0, 0.045],
};

// Accent stays at 3:1 against the theme surface and keeps white button labels legible
export const SKIN_ACCENT_LUMINANCE_RANGE: Record<
  SkinThemeMode,
  readonly [number, number]
> = {
  light: [0, 0.3],
  dark: [0.12, 0.37],
};
