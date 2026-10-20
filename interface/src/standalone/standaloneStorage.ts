import { type SkinSettings } from '../types/SkinSettings';
import { normalizeSkinSettings } from '../utils/normalizeSkinSettings';

const STORAGE_KEY = 'nordiv-skin.settings';

export const readStandaloneSettings = (): SkinSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return normalizeSkinSettings(stored === null ? null : JSON.parse(stored));
  } catch {
    return normalizeSkinSettings(null);
  }
};

export const writeStandaloneSettings = (settings: SkinSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or full storage: the skin still applies for this session
  }
};
