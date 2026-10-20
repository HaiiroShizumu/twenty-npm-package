import { SKIN_DEFAULT_SETTINGS } from '../../constants/SkinDefaultSettings';
import {
  isSkinSettings,
  normalizeSkinSettings,
} from '../normalizeSkinSettings';

describe('normalizeSkinSettings', () => {
  it('falls back to defaults for anything that is not an object', () => {
    expect(normalizeSkinSettings('broken')).toEqual(SKIN_DEFAULT_SETTINGS);
    expect(normalizeSkinSettings(null)).toEqual(SKIN_DEFAULT_SETTINGS);
  });

  it('replaces invalid fields one by one', () => {
    const settings = normalizeSkinSettings({
      accent: 'red',
      light: { glass: 9, veil: 2, blur: 1, background: { kind: 'none' } },
      dark: { background: { kind: 'color', color: '#ABCDEF' } },
    });

    expect(settings.accent).toBe(SKIN_DEFAULT_SETTINGS.accent);
    expect(settings.light).toEqual({
      background: { kind: 'none' },
      glass: SKIN_DEFAULT_SETTINGS.light.glass,
      veil: 2,
      blur: 1,
    });
    expect(settings.dark.background).toEqual({
      kind: 'color',
      color: '#abcdef',
    });
  });

  it('accepts its own output', () => {
    expect(isSkinSettings(normalizeSkinSettings({}))).toBe(true);
    expect(isSkinSettings({ version: 1 })).toBe(false);
  });
});
