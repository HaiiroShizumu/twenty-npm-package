import { SKIN_DEFAULT_SETTINGS } from '../../constants/SkinDefaultSettings';
import { type SkinBackdropSample } from '../../types/SkinBackdropSample';
import { type SkinThemeProfile } from '../../types/SkinThemeProfile';
import { getHexLuminance } from '../color';
import { getSkinLevelOptions } from '../getSkinLevelOptions';
import { resolveSkinProfile } from '../resolveSkinProfile';

const createSample = (
  luminance: number,
  spread = 0.05,
): SkinBackdropSample => ({
  luminance,
  darkLuminance: Math.max(0, luminance - spread),
  lightLuminance: Math.min(1, luminance + spread),
  topLuminance: luminance,
  averageColor: '#808080',
});

const imageProfile = (
  overrides: Partial<SkinThemeProfile> = {},
): SkinThemeProfile => ({
  background: { kind: 'image', url: '/wallpapers/test.jpg' },
  glass: 0,
  veil: 0,
  blur: 0,
  ...overrides,
});

describe('resolveSkinProfile', () => {
  it('keeps the requested levels when text is already readable', () => {
    const resolution = resolveSkinProfile({
      mode: 'light',
      profile: imageProfile({ glass: 2, veil: 1 }),
      accent: '#2563EB',
      sample: createSample(0.7),
    });

    expect(resolution.raised).toEqual([]);
    expect(resolution.profile.glass).toBe(2);
    expect(resolution.profile.veil).toBe(1);
    expect(resolution.panelContrast).toBeGreaterThanOrEqual(4.5);
  });

  it('raises panel density for dark text over a dark wallpaper', () => {
    const resolution = resolveSkinProfile({
      mode: 'light',
      profile: imageProfile(),
      accent: '#2563EB',
      sample: createSample(0.01, 0.01),
    });

    expect(resolution.raised).toContain('glass');
    expect(resolution.profile.glass).toBeGreaterThan(0);
    expect(resolution.panelMutedContrast).toBeGreaterThanOrEqual(3);
  });

  it('raises panel density for light text over a bright wallpaper', () => {
    const resolution = resolveSkinProfile({
      mode: 'dark',
      profile: imageProfile(),
      accent: '#2563EB',
      sample: createSample(0.9),
    });

    expect(resolution.profile.glass).toBeGreaterThan(0);
    expect(resolution.panelMutedContrast).toBeGreaterThanOrEqual(3);
  });

  it('raises the veil when titles cannot be read on a patchy canvas', () => {
    const resolution = resolveSkinProfile({
      mode: 'light',
      profile: imageProfile({ glass: 4 }),
      accent: '#2563EB',
      sample: {
        luminance: 0.18,
        darkLuminance: 0.02,
        lightLuminance: 0.45,
        topLuminance: 0.18,
        averageColor: '#808080',
      },
    });

    expect(resolution.raised).toContain('veil');
    expect(resolution.canvasContrast).toBeGreaterThanOrEqual(3);
  });

  it('never lowers a level the user picked', () => {
    const resolution = resolveSkinProfile({
      mode: 'dark',
      profile: imageProfile({ glass: 3, veil: 4, blur: 4 }),
      accent: '#2563EB',
      sample: createSample(0.05),
    });

    expect(resolution.profile).toMatchObject({ glass: 3, veil: 4, blur: 4 });
  });

  it('waits for the wallpaper sample before grading', () => {
    const resolution = resolveSkinProfile({
      mode: 'light',
      profile: imageProfile(),
      accent: '#2563EB',
      sample: null,
    });

    expect(resolution.grade).toBe('pending');
    expect(resolution.raised).toEqual([]);
  });

  it('makes panels solid and drops veil and blur without a background', () => {
    const resolution = resolveSkinProfile({
      mode: 'dark',
      profile: { background: { kind: 'none' }, glass: 0, veil: 3, blur: 3 },
      accent: '#2563EB',
      sample: null,
    });

    expect(resolution.profile).toMatchObject({ glass: 4, veil: 0, blur: 0 });
    expect(resolution.lockedSettings).toEqual(['glass', 'veil', 'blur']);
    expect(resolution.grade).toBe('excellent');
  });

  it('keeps a solid color on its theme side', () => {
    const lightOnDark = resolveSkinProfile({
      mode: 'dark',
      profile: {
        background: { kind: 'color', color: '#f5f5f5' },
        glass: 2,
        veil: 0,
        blur: 0,
      },
      accent: '#2563EB',
      sample: null,
    });
    const darkOnLight = resolveSkinProfile({
      mode: 'light',
      profile: {
        background: { kind: 'color', color: '#101010' },
        glass: 2,
        veil: 0,
        blur: 0,
      },
      accent: '#2563EB',
      sample: null,
    });

    expect(getHexLuminance(lightOnDark.canvasColor)).toBeLessThanOrEqual(0.045);
    expect(getHexLuminance(darkOnLight.canvasColor)).toBeGreaterThanOrEqual(
      0.55,
    );
  });

  it('adjusts the accent per theme', () => {
    const settings = { ...SKIN_DEFAULT_SETTINGS, accent: '#fde047' };
    const light = resolveSkinProfile({
      mode: 'light',
      profile: settings.light,
      accent: settings.accent,
      sample: null,
    });
    const dark = resolveSkinProfile({
      mode: 'dark',
      profile: settings.dark,
      accent: '#1e1b4b',
      sample: null,
    });

    expect(getHexLuminance(light.accent)).toBeLessThanOrEqual(0.3);
    expect(getHexLuminance(dark.accent)).toBeGreaterThanOrEqual(0.12);
  });
});

describe('getSkinLevelOptions', () => {
  it('disables the levels that the readability pass would override', () => {
    const options = getSkinLevelOptions(
      {
        mode: 'light',
        profile: imageProfile(),
        accent: '#2563EB',
        sample: createSample(0.01, 0.01),
      },
      'glass',
    );

    expect(options[0].isReadable).toBe(false);
    expect(options[4].isReadable).toBe(true);
  });
});
