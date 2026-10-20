import { SKIN_LEVELS } from '../constants/SkinLevels';
import { type SkinLevelOption } from '../types/SkinLevelOption';
import { type SkinLevelSetting } from '../types/SkinLevelSetting';
import {
  resolveSkinProfile,
  type ResolveSkinProfileParams,
} from './resolveSkinProfile';

// A level is readable when picking it would not be overridden by the
// readability pass; settings UIs disable the others
export const getSkinLevelOptions = (
  params: ResolveSkinProfileParams,
  setting: SkinLevelSetting,
): SkinLevelOption[] =>
  SKIN_LEVELS.map((level) => {
    const resolution = resolveSkinProfile({
      ...params,
      profile: { ...params.profile, [setting]: level },
    });

    return {
      level,
      isReadable:
        resolution.grade === 'pending' ||
        resolution.lockedSettings.includes(setting) ||
        resolution.profile[setting] === level,
    };
  });
