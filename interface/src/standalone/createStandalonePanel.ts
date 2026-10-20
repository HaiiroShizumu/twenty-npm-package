import { SKIN_ACCENT_PRESETS } from '../constants/SkinAccentPresets';
import { SKIN_DEFAULT_PROFILES } from '../constants/SkinDefaultSettings';
import { SKIN_SOLID_COLOR_PRESETS } from '../constants/SkinSolidColorPresets';
import { SKIN_WALLPAPER_PRESETS } from '../constants/SkinWallpaperPresets';
import { type SkinBackdropSample } from '../types/SkinBackdropSample';
import { type SkinBackground } from '../types/SkinBackground';
import { type SkinLevelSetting } from '../types/SkinLevelSetting';
import { type SkinSettings } from '../types/SkinSettings';
import { type SkinThemeMode } from '../types/SkinThemeMode';
import { type SkinThemeProfile } from '../types/SkinThemeProfile';
import { getSkinLevelOptions } from '../utils/getSkinLevelOptions';
import { isSkinLevel } from '../utils/normalizeSkinSettings';
import { resolveSkinProfile } from '../utils/resolveSkinProfile';
import { getStandaloneLabels } from './standaloneLabels';

type StandalonePanelParams = {
  getSettings: () => SkinSettings;
  getMode: () => SkinThemeMode;
  getSample: (url: string) => SkinBackdropSample | null;
  onChange: (settings: SkinSettings) => void;
};

const LEVEL_SETTINGS: SkinLevelSetting[] = ['glass', 'veil', 'blur'];

const PALETTE_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25"/><path d="M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg>';

const element = <TTag extends keyof HTMLElementTagNameMap>(
  tag: TTag,
  className: string,
  text?: string,
) => {
  const node = document.createElement(tag);

  node.className = className;

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
};

const segmented = <TValue extends string>(
  options: {
    value: TValue;
    label: string;
    disabled?: boolean;
    title?: string;
  }[],
  activeValue: TValue,
  onSelect: (value: TValue) => void,
) => {
  const group = element('div', 'nordiv-skin-segmented');

  group.setAttribute('role', 'radiogroup');

  for (const option of options) {
    const button = element('button', 'nordiv-skin-segment', option.label);

    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(option.value === activeValue));
    button.disabled = option.disabled === true;

    if (option.title !== undefined) {
      button.title = option.title;
    }

    button.addEventListener('click', () => onSelect(option.value));
    group.append(button);
  }

  return group;
};

const section = (title: string, ...children: HTMLElement[]) => {
  const container = element('div', 'nordiv-skin-section');

  container.append(element('div', 'nordiv-skin-label', title), ...children);

  return container;
};

export const createStandalonePanel = ({
  getSettings,
  getMode,
  getSample,
  onChange,
}: StandalonePanelParams) => {
  const labels = getStandaloneLabels();
  const toggle = element('button', 'nordiv-skin-toggle');
  const panel = element('div', 'nordiv-skin-panel');
  let editedMode: SkinThemeMode | null = null;

  toggle.type = 'button';
  toggle.title = labels.openSettings;
  toggle.setAttribute('aria-label', labels.openSettings);
  toggle.innerHTML = PALETTE_ICON;
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', labels.title);

  const updateProfile = (
    mode: SkinThemeMode,
    patch: Partial<SkinThemeProfile>,
  ) => {
    const settings = getSettings();

    onChange({ ...settings, [mode]: { ...settings[mode], ...patch } });
  };

  const render = () => {
    if (panel.hidden) {
      return;
    }

    const settings = getSettings();
    const mode = editedMode ?? getMode();
    const profile = settings[mode];
    const sample =
      profile.background.kind === 'image'
        ? getSample(profile.background.url)
        : null;
    const resolveParams = { mode, profile, accent: settings.accent, sample };
    const resolution = resolveSkinProfile(resolveParams);

    panel.replaceChildren();

    const header = element('div', 'nordiv-skin-header');
    const close = element('button', 'nordiv-skin-close', '×');

    close.type = 'button';
    close.setAttribute('aria-label', '×');
    close.addEventListener('click', () => setOpen(false));
    header.append(element('div', 'nordiv-skin-title', labels.title), close);
    panel.append(header);

    panel.append(
      section(
        labels.editedTheme,
        segmented<SkinThemeMode>(
          [
            { value: 'light', label: labels.light },
            { value: 'dark', label: labels.dark },
          ],
          mode,
          (nextMode) => {
            editedMode = nextMode;
            render();
          },
        ),
      ),
    );

    const backgroundKind = profile.background.kind;
    const backgroundChildren: HTMLElement[] = [
      segmented<SkinBackground['kind']>(
        [
          { value: 'image', label: labels.wallpaper },
          { value: 'color', label: labels.color },
          { value: 'none', label: labels.noBackground },
        ],
        backgroundKind,
        (kind) => {
          if (kind === backgroundKind) {
            return;
          }

          updateProfile(mode, {
            background:
              kind === 'image'
                ? SKIN_DEFAULT_PROFILES[mode].background
                : kind === 'color'
                  ? { kind: 'color', color: SKIN_SOLID_COLOR_PRESETS[mode][0] }
                  : { kind: 'none' },
          });
        },
      ),
    ];

    if (profile.background.kind === 'image') {
      const grid = element('div', 'nordiv-skin-wallpapers');
      const activeUrl = profile.background.url;

      for (const preset of SKIN_WALLPAPER_PRESETS) {
        const button = element('button', 'nordiv-skin-wallpaper');
        button.type = 'button';
        button.title = labels.isRussian ? preset.label.ru : preset.label.en;
        button.style.backgroundImage = `url("${preset.url}")`;
        button.setAttribute('aria-pressed', String(preset.url === activeUrl));
        button.addEventListener('click', () =>
          updateProfile(mode, {
            background: { kind: 'image', url: preset.url },
          }),
        );
        grid.append(button);
      }

      backgroundChildren.push(grid);
    }

    if (profile.background.kind === 'color') {
      const swatches = element('div', 'nordiv-skin-swatches');
      const activeColor = profile.background.color;

      for (const color of SKIN_SOLID_COLOR_PRESETS[mode]) {
        const button = element('button', 'nordiv-skin-swatch');

        button.type = 'button';
        button.title = color;
        button.style.backgroundColor = color;
        button.setAttribute('aria-pressed', String(color === activeColor));
        button.addEventListener('click', () =>
          updateProfile(mode, { background: { kind: 'color', color } }),
        );
        swatches.append(button);
      }

      backgroundChildren.push(swatches);
    }

    panel.append(section(labels.background, ...backgroundChildren));

    for (const setting of LEVEL_SETTINGS) {
      if (resolution.lockedSettings.includes(setting)) {
        continue;
      }

      const levelLabels = labels.levels[setting];
      const options = getSkinLevelOptions(resolveParams, setting);

      panel.append(
        section(
          levelLabels[mode],
          segmented(
            options.map((option) => ({
              value: String(option.level),
              label: levelLabels.values[option.level],
              disabled: !option.isReadable,
              title: option.isReadable ? undefined : labels.unreadable,
            })),
            String(resolution.profile[setting]),
            (value) => {
              const level = Number(value);

              if (isSkinLevel(level)) {
                const patch: Partial<SkinThemeProfile> = {};

                patch[setting] = level;
                updateProfile(mode, patch);
              }
            },
          ),
        ),
      );
    }

    const accents = element('div', 'nordiv-skin-swatches');

    for (const accent of SKIN_ACCENT_PRESETS) {
      const button = element('button', 'nordiv-skin-swatch');

      button.type = 'button';
      button.title = accent;
      button.style.backgroundColor = accent;
      button.setAttribute(
        'aria-pressed',
        String(accent.toLowerCase() === settings.accent.toLowerCase()),
      );
      button.addEventListener('click', () => onChange({ ...settings, accent }));
      accents.append(button);
    }

    panel.append(section(labels.accent, accents));

    const status = element(
      'div',
      `nordiv-skin-status nordiv-skin-status-${resolution.grade}`,
      labels.readability[resolution.grade],
    );

    if (resolution.raised.length > 0) {
      status.textContent += ` · ${labels.raised}: ${resolution.raised
        .map((setting) => labels.levels[setting][mode].toLowerCase())
        .join(', ')}`;
    }

    const reset = element('button', 'nordiv-skin-reset', labels.reset);

    reset.type = 'button';
    reset.addEventListener('click', () =>
      onChange({ ...settings, [mode]: SKIN_DEFAULT_PROFILES[mode] }),
    );

    const footer = element('div', 'nordiv-skin-footer');

    footer.append(status, reset);
    panel.append(footer);
  };

  const setOpen = (isOpen: boolean) => {
    panel.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', String(isOpen));

    if (!isOpen) {
      editedMode = null;
    }

    render();
  };

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
    }
  });

  return { nodes: [toggle, panel], render };
};
