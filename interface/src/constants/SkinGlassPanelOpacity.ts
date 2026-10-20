import { type SkinThemeMode } from '../types/SkinThemeMode';

// Feeds --panel-opacity; skin.css maps it onto [glass floor, 1]. Level 4 is a solid panel
export const SKIN_GLASS_PANEL_OPACITY: Record<
  SkinThemeMode,
  readonly [number, number, number, number, number]
> = {
  light: [0.12, 0.3, 0.5, 0.72, 1],
  dark: [0.1, 0.3, 0.5, 0.72, 1],
};
