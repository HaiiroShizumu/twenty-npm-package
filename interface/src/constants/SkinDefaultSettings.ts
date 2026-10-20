import { type SkinSettings } from '../types/SkinSettings';
import { type SkinThemeProfile } from '../types/SkinThemeProfile';
import { SKIN_DEFAULT_ACCENT } from './SkinAccentPresets';

const DEFAULT_WALLPAPER_URL = '/wallpapers/taupe-curves.jpg';

export const SKIN_DEFAULT_PROFILES: Record<'light' | 'dark', SkinThemeProfile> =
  {
    light: {
      background: { kind: 'image', url: DEFAULT_WALLPAPER_URL },
      glass: 2,
      veil: 1,
      blur: 3,
    },
    dark: {
      background: { kind: 'image', url: DEFAULT_WALLPAPER_URL },
      glass: 2,
      veil: 2,
      blur: 3,
    },
  };

export const SKIN_DEFAULT_SETTINGS: SkinSettings = {
  version: 1,
  accent: SKIN_DEFAULT_ACCENT,
  light: SKIN_DEFAULT_PROFILES.light,
  dark: SKIN_DEFAULT_PROFILES.dark,
};
