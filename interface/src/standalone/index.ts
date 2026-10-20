import { type SkinBackdropSample } from '../types/SkinBackdropSample';
import { type SkinSettings } from '../types/SkinSettings';
import { type SkinThemeMode } from '../types/SkinThemeMode';
import { applySkin } from '../utils/applySkin';
import { sampleSkinBackdrop } from '../utils/sampleSkinBackdrop';
import { createStandalonePanel } from './createStandalonePanel';
import {
  readStandaloneSettings,
  writeStandaloneSettings,
} from './standaloneStorage';

// Stock Twenty toggles .light/.dark on <html> from its own theme setting
const getMode = (): SkinThemeMode =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const mountWallpaperLayers = () => {
  if (document.querySelector('[data-smb-wallpaper-layer]') !== null) {
    return;
  }

  const layers = ['fallback', 'image', 'dim'].map((layer) => {
    const node = document.createElement('div');

    node.setAttribute('aria-hidden', 'true');
    node.dataset.smbWallpaperLayer = layer;

    return node;
  });

  document.body.prepend(...layers);
};

const start = () => {
  const root = document.documentElement;
  const samples = new Map<string, SkinBackdropSample>();
  let settings: SkinSettings = readStandaloneSettings();

  const getSample = (url: string) => samples.get(url) ?? null;

  const requestSample = (url: string) => {
    if (samples.has(url)) {
      return;
    }

    sampleSkinBackdrop(url)
      .then((sample) => {
        samples.set(url, sample);
        apply();
      })
      .catch(() => {
        // The skin stays on its unsampled defaults for this wallpaper
      });
  };

  const panel = createStandalonePanel({
    getSettings: () => settings,
    getMode,
    getSample,
    onChange: (nextSettings) => {
      settings = nextSettings;
      writeStandaloneSettings(settings);
      apply();
    },
  });

  const apply = () => {
    const mode = getMode();

    for (const profile of [settings.light, settings.dark]) {
      if (profile.background.kind === 'image') {
        requestSample(profile.background.url);
      }
    }

    const background = settings[mode].background;

    applySkin({
      root,
      mode,
      settings,
      sample: background.kind === 'image' ? getSample(background.url) : null,
    });
    root.dataset.skinHost = 'standalone';
    panel.render();
  };

  mountWallpaperLayers();
  document.body.append(...panel.nodes);
  apply();

  new MutationObserver(apply).observe(root, {
    attributes: true,
    attributeFilter: ['class'],
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'nordiv-skin.settings') {
      settings = readStandaloneSettings();
      apply();
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
