import { SKIN_BLUR_PIXELS } from '../constants/SkinBlurPixels';
import { SKIN_GLASS_PANEL_OPACITY } from '../constants/SkinGlassPanelOpacity';
import { SKIN_ROOT_CSS_VARIABLES } from '../constants/SkinRootCssVariables';
import { SKIN_VEIL_AMOUNTS } from '../constants/SkinVeilAmounts';
import { type SkinBackdropSample } from '../types/SkinBackdropSample';
import { type SkinResolution } from '../types/SkinResolution';
import { type SkinSettings } from '../types/SkinSettings';
import { type SkinThemeMode } from '../types/SkinThemeMode';
import { resolveSkinProfile } from './resolveSkinProfile';

export type ApplySkinParams = {
  root: HTMLElement;
  mode: SkinThemeMode;
  settings: SkinSettings;
  sample: SkinBackdropSample | null;
};

export const clearSkin = (root: HTMLElement) => {
  for (const cssVariable of SKIN_ROOT_CSS_VARIABLES) {
    root.style.removeProperty(cssVariable);
  }

  delete root.dataset.skin;
  delete root.dataset.theme;
  delete root.dataset.wallpaper;
  delete root.dataset.background;
};

// The static light/dark palette lives in skin.css; only per-user values are
// written inline, and always the readability-corrected ones
export const applySkin = ({
  root,
  mode,
  settings,
  sample,
}: ApplySkinParams): SkinResolution => {
  const resolution = resolveSkinProfile({
    mode,
    profile: settings[mode],
    accent: settings.accent,
    sample,
  });
  const { profile } = resolution;
  const background = profile.background;
  const hasWallpaper = background.kind === 'image';

  clearSkin(root);

  root.dataset.skin = 'smb';
  root.dataset.theme = mode;
  root.dataset.wallpaper = hasWallpaper ? 'true' : 'false';
  root.dataset.background = background.kind;

  root.style.setProperty('--color-accent', resolution.accent);
  root.style.setProperty(
    '--panel-opacity',
    String(SKIN_GLASS_PANEL_OPACITY[mode][profile.glass]),
  );
  root.style.setProperty(
    '--app-bg-image',
    hasWallpaper ? `url("${background.url.replace(/"/g, '%22')}")` : 'none',
  );
  root.style.setProperty(
    '--app-bg-dim',
    String(SKIN_VEIL_AMOUNTS[profile.veil]),
  );
  root.style.setProperty(
    '--app-bg-dim-rgb',
    mode === 'light' ? '255 255 255' : '0 0 0',
  );
  root.style.setProperty(
    '--app-bg-blur',
    `${SKIN_BLUR_PIXELS[profile.blur]}px`,
  );
  root.style.setProperty('--color-on-bg', resolution.onCanvas.text);
  root.style.setProperty('--color-on-bg-muted', resolution.onCanvas.muted);

  if (background.kind === 'color') {
    root.style.setProperty('--color-bg', resolution.canvasColor);
    root.style.setProperty('--smb-canvas-solid', resolution.canvasColor);
    root.style.setProperty('--smb-wallpaper-average', resolution.canvasColor);
  } else if (hasWallpaper && sample !== null) {
    root.style.setProperty('--smb-wallpaper-average', sample.averageColor);
  }

  return resolution;
};
