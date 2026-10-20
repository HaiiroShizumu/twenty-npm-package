import { type SkinBackground } from './SkinBackground';
import { type SkinLevel } from './SkinLevel';

// glass: 0 most transparent … 4 solid; veil: 0 none … 4 strongest wash
// toward the theme tone; blur: 0 sharp … 4 strongest
export type SkinThemeProfile = {
  background: SkinBackground;
  glass: SkinLevel;
  veil: SkinLevel;
  blur: SkinLevel;
};
