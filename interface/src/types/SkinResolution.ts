import { type SkinLevelSetting } from './SkinLevelSetting';
import { type SkinOnCanvasColors } from './SkinOnCanvasColors';
import { type SkinReadabilityGrade } from './SkinReadabilityGrade';
import { type SkinThemeMode } from './SkinThemeMode';
import { type SkinThemeProfile } from './SkinThemeProfile';

export type SkinResolution = {
  mode: SkinThemeMode;
  profile: SkinThemeProfile;
  accent: string;
  canvasColor: string;
  onCanvas: SkinOnCanvasColors;
  raised: SkinLevelSetting[];
  lockedSettings: SkinLevelSetting[];
  panelContrast: number | null;
  panelMutedContrast: number | null;
  canvasContrast: number | null;
  grade: SkinReadabilityGrade;
};
