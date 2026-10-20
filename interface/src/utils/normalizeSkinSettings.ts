import { SKIN_DEFAULT_SETTINGS } from '../constants/SkinDefaultSettings';
import { type SkinBackground } from '../types/SkinBackground';
import { type SkinLevel } from '../types/SkinLevel';
import { type SkinSettings } from '../types/SkinSettings';
import { type SkinThemeProfile } from '../types/SkinThemeProfile';
import { isHexColor } from './color';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isSkinLevel = (value: unknown): value is SkinLevel =>
  value === 0 || value === 1 || value === 2 || value === 3 || value === 4;

const normalizeBackground = (
  value: unknown,
  fallback: SkinBackground,
): SkinBackground => {
  if (!isRecord(value)) {
    return fallback;
  }

  if (value.kind === 'none') {
    return { kind: 'none' };
  }

  if (value.kind === 'color' && isHexColor(value.color)) {
    return { kind: 'color', color: value.color.toLowerCase() };
  }

  if (
    value.kind === 'image' &&
    typeof value.url === 'string' &&
    value.url.trim().length > 0
  ) {
    return { kind: 'image', url: value.url };
  }

  return fallback;
};

const normalizeProfile = (
  value: unknown,
  fallback: SkinThemeProfile,
): SkinThemeProfile => {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    background: normalizeBackground(value.background, fallback.background),
    glass: isSkinLevel(value.glass) ? value.glass : fallback.glass,
    veil: isSkinLevel(value.veil) ? value.veil : fallback.veil,
    blur: isSkinLevel(value.blur) ? value.blur : fallback.blur,
  };
};

// Stored settings come from localStorage or a server-side user var, so any
// shape is possible; every field falls back on its own
export const normalizeSkinSettings = (value: unknown): SkinSettings => {
  if (!isRecord(value)) {
    return SKIN_DEFAULT_SETTINGS;
  }

  return {
    version: 1,
    accent: isHexColor(value.accent)
      ? value.accent
      : SKIN_DEFAULT_SETTINGS.accent,
    light: normalizeProfile(value.light, SKIN_DEFAULT_SETTINGS.light),
    dark: normalizeProfile(value.dark, SKIN_DEFAULT_SETTINGS.dark),
  };
};

export const isSkinSettings = (value: unknown): value is SkinSettings =>
  isRecord(value) &&
  value.version === 1 &&
  JSON.stringify(normalizeSkinSettings(value)) === JSON.stringify(value);
