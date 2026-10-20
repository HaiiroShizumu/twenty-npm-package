/* oxlint-disable twenty/no-hardcoded-colors */
import { SKIN_BLUR_SPREAD } from '../constants/SkinBlurPixels';
import {
  SKIN_GLASS_BACKDROP_BRIGHTNESS,
  SKIN_GLASS_FLOOR,
} from '../constants/SkinGlassFloor';
import { SKIN_GLASS_PANEL_OPACITY } from '../constants/SkinGlassPanelOpacity';
import {
  SKIN_ACCENT_LUMINANCE_RANGE,
  SKIN_CANVAS_LUMINANCE_RANGE,
} from '../constants/SkinLuminanceRanges';
import { SKIN_READABILITY_THRESHOLDS } from '../constants/SkinReadabilityThresholds';
import { SKIN_THEME_PALETTE } from '../constants/SkinThemePalette';
import { SKIN_VEIL_AMOUNTS } from '../constants/SkinVeilAmounts';
import { type SkinBackdropSample } from '../types/SkinBackdropSample';
import { type SkinLevel } from '../types/SkinLevel';
import { type SkinLevelSetting } from '../types/SkinLevelSetting';
import { type SkinOnCanvasColors } from '../types/SkinOnCanvasColors';
import { type SkinResolution } from '../types/SkinResolution';
import { type SkinThemeMode } from '../types/SkinThemeMode';
import { type SkinThemeProfile } from '../types/SkinThemeProfile';
import {
  blendLuminance,
  clampHexLuminance,
  getContrastRatio,
  getHexLuminance,
  isHexColor,
  scaleLuminanceBrightness,
} from './color';

export type ResolveSkinProfileParams = {
  mode: SkinThemeMode;
  profile: SkinThemeProfile;
  accent: string;
  // Required for an image background; null while it is still being sampled
  sample: SkinBackdropSample | null;
};

const ON_CANVAS_TEXT_ALPHA = 0.78;

const ON_CANVAS_COLORS: Record<'light' | 'dark', SkinOnCanvasColors> = {
  light: {
    text: 'rgba(255, 255, 255, 0.78)',
    muted: 'rgba(255, 255, 255, 0.55)',
  },
  dark: {
    text: 'rgba(9, 9, 11, 0.78)',
    muted: 'rgba(9, 9, 11, 0.52)',
  },
};

const WHITE_LUMINANCE = 1;
const DARK_TEXT_LUMINANCE = getHexLuminance('#09090b');

type CanvasLuminances = {
  mean: number;
  dark: number;
  light: number;
  top: number;
};

const raiseLevel = (level: SkinLevel): SkinLevel =>
  Math.min(4, level + 1) as SkinLevel;

export const getSkinCanvasColor = (
  mode: SkinThemeMode,
  profile: SkinThemeProfile,
) =>
  profile.background.kind === 'color' && isHexColor(profile.background.color)
    ? clampHexLuminance(
        profile.background.color,
        ...SKIN_CANVAS_LUMINANCE_RANGE[mode],
      )
    : SKIN_THEME_PALETTE[mode].canvas;

export const getSkinAccent = (mode: SkinThemeMode, accent: string) =>
  clampHexLuminance(
    isHexColor(accent) ? accent : '#CA8A04',
    ...SKIN_ACCENT_LUMINANCE_RANGE[mode],
  );

// Effective levels for a background kind: without a wallpaper there is
// nothing to veil or blur, and with no background at all panels are solid
const normalizeProfileForBackground = (
  profile: SkinThemeProfile,
): { profile: SkinThemeProfile; lockedSettings: SkinLevelSetting[] } => {
  if (profile.background.kind === 'none') {
    return {
      profile: { ...profile, glass: 4, veil: 0, blur: 0 },
      lockedSettings: ['glass', 'veil', 'blur'],
    };
  }

  if (profile.background.kind === 'color') {
    return {
      profile: { ...profile, veil: 0, blur: 0 },
      lockedSettings: ['veil', 'blur'],
    };
  }

  return { profile, lockedSettings: [] };
};

const getCanvasLuminances = (
  mode: SkinThemeMode,
  profile: SkinThemeProfile,
  sample: SkinBackdropSample | null,
): CanvasLuminances | null => {
  if (profile.background.kind !== 'image') {
    const luminance = getHexLuminance(getSkinCanvasColor(mode, profile));

    return {
      mean: luminance,
      dark: luminance,
      light: luminance,
      top: luminance,
    };
  }

  if (sample === null) {
    return null;
  }

  const veilTarget = mode === 'light' ? 1 : 0;
  const veilAmount = SKIN_VEIL_AMOUNTS[profile.veil];
  const veil = (luminance: number) =>
    blendLuminance(veilTarget, luminance, veilAmount);

  return {
    mean: veil(sample.luminance),
    dark: veil(sample.darkLuminance),
    light: veil(sample.lightLuminance),
    top: veil(sample.topLuminance),
  };
};

const getPanelContrasts = (
  mode: SkinThemeMode,
  profile: SkinThemeProfile,
  canvas: CanvasLuminances,
) => {
  const palette = SKIN_THEME_PALETTE[mode];
  const spread = SKIN_BLUR_SPREAD[profile.blur];
  // Dark ink fails first over the darkest patch, light ink over the brightest
  const extreme = mode === 'light' ? canvas.dark : canvas.light;
  const worstBackdrop = canvas.mean + (extreme - canvas.mean) * spread;
  const floor = SKIN_GLASS_FLOOR[mode];
  const glassOpacity =
    floor + SKIN_GLASS_PANEL_OPACITY[mode][profile.glass] * (1 - floor);
  const panelLuminance = blendLuminance(
    getHexLuminance(palette.surface),
    scaleLuminanceBrightness(
      worstBackdrop,
      SKIN_GLASS_BACKDROP_BRIGHTNESS[mode],
    ),
    glassOpacity,
  );

  return {
    text: getContrastRatio(getHexLuminance(palette.ink), panelLuminance),
    muted: getContrastRatio(getHexLuminance(palette.inkMuted), panelLuminance),
  };
};

// Titles sit on the canvas itself, so both text tones are tried against the
// top of the backdrop and the one with the better worst case wins
const getCanvasText = (canvas: CanvasLuminances) => {
  const topExtremes = [
    canvas.top,
    (canvas.top + canvas.dark) / 2,
    (canvas.top + canvas.light) / 2,
  ];
  const worstContrast = (textLuminance: number) =>
    Math.min(
      ...topExtremes.map((backdropLuminance) =>
        getContrastRatio(
          blendLuminance(
            textLuminance,
            backdropLuminance,
            ON_CANVAS_TEXT_ALPHA,
          ),
          backdropLuminance,
        ),
      ),
    );
  const lightTextContrast = worstContrast(WHITE_LUMINANCE);
  const darkTextContrast = worstContrast(DARK_TEXT_LUMINANCE);

  return lightTextContrast >= darkTextContrast
    ? { colors: ON_CANVAS_COLORS.light, contrast: lightTextContrast }
    : { colors: ON_CANVAS_COLORS.dark, contrast: darkTextContrast };
};

const isPanelReadable = (contrasts: { text: number; muted: number }) =>
  contrasts.text >= SKIN_READABILITY_THRESHOLDS.panelText &&
  contrasts.muted >= SKIN_READABILITY_THRESHOLDS.panelMutedText;

// Never lowers a level the user chose: it only raises glass, then the veil,
// until panel text and canvas titles clear the WCAG thresholds
export const resolveSkinProfile = ({
  mode,
  profile: requestedProfile,
  accent,
  sample,
}: ResolveSkinProfileParams): SkinResolution => {
  const { profile: normalizedProfile, lockedSettings } =
    normalizeProfileForBackground(requestedProfile);
  const base = {
    mode,
    accent: getSkinAccent(mode, accent),
    canvasColor: getSkinCanvasColor(mode, normalizedProfile),
    lockedSettings,
  };

  if (getCanvasLuminances(mode, normalizedProfile, sample) === null) {
    return {
      ...base,
      profile: normalizedProfile,
      // Matches skin.css: over a wallpaper titles start white until sampled
      onCanvas: ON_CANVAS_COLORS.light,
      raised: [],
      panelContrast: null,
      panelMutedContrast: null,
      canvasContrast: null,
      grade: 'pending',
    };
  }

  let profile = normalizedProfile;
  const raised = new Set<SkinLevelSetting>();
  const evaluate = (candidate: SkinThemeProfile) => {
    const canvas = getCanvasLuminances(
      mode,
      candidate,
      sample,
    ) as CanvasLuminances;

    return {
      panel: getPanelContrasts(mode, candidate, canvas),
      canvasText: getCanvasText(canvas),
    };
  };

  let evaluation = evaluate(profile);

  while (!isPanelReadable(evaluation.panel) && profile.glass < 4) {
    profile = { ...profile, glass: raiseLevel(profile.glass) };
    raised.add('glass');
    evaluation = evaluate(profile);
  }

  while (
    evaluation.canvasText.contrast < SKIN_READABILITY_THRESHOLDS.canvasText &&
    profile.background.kind === 'image' &&
    profile.veil < 4
  ) {
    profile = { ...profile, veil: raiseLevel(profile.veil) };
    raised.add('veil');
    evaluation = evaluate(profile);
  }

  const isExcellent =
    evaluation.panel.text >= SKIN_READABILITY_THRESHOLDS.excellentPanelText &&
    evaluation.panel.muted >=
      SKIN_READABILITY_THRESHOLDS.excellentPanelMutedText;

  return {
    ...base,
    profile,
    onCanvas: evaluation.canvasText.colors,
    raised: [...raised],
    panelContrast: evaluation.panel.text,
    panelMutedContrast: evaluation.panel.muted,
    canvasContrast: evaluation.canvasText.contrast,
    grade: isExcellent ? 'excellent' : 'good',
  };
};
