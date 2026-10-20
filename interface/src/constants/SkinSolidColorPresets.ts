/* oxlint-disable twenty/no-hardcoded-colors */
import { type SkinThemeMode } from '../types/SkinThemeMode';

export const SKIN_SOLID_COLOR_PRESETS: Record<
  SkinThemeMode,
  readonly string[]
> = {
  light: ['#f4f4f5', '#eef2f7', '#f5efe6', '#ecf3ec', '#f1edf7', '#f7ecec'],
  dark: ['#121212', '#0f172a', '#1a1714', '#0f1a15', '#17131f', '#1b1f24'],
};
