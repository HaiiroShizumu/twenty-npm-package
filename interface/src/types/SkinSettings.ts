import { type SkinThemeProfile } from './SkinThemeProfile';

// Each theme keeps its own background and levels, so a light theme can never
// end up on a dark backdrop chosen for the dark one
export type SkinSettings = {
  version: 1;
  accent: string;
  light: SkinThemeProfile;
  dark: SkinThemeProfile;
};
