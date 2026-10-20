import { type SkinLevelSetting } from '../types/SkinLevelSetting';

type StandaloneLabels = {
  isRussian: boolean;
  openSettings: string;
  title: string;
  editedTheme: string;
  light: string;
  dark: string;
  background: string;
  wallpaper: string;
  color: string;
  noBackground: string;
  levels: Record<
    SkinLevelSetting,
    { light: string; dark: string; values: string[] }
  >;
  accent: string;
  reset: string;
  readability: { excellent: string; good: string; pending: string };
  raised: string;
  unreadable: string;
};

const RU: StandaloneLabels = {
  isRussian: true,
  openSettings: 'Оформление',
  title: 'Оформление',
  editedTheme: 'Тема',
  light: 'Светлая',
  dark: 'Тёмная',
  background: 'Фон',
  wallpaper: 'Обои',
  color: 'Цвет',
  noBackground: 'Без фона',
  levels: {
    glass: {
      light: 'Плотность панелей',
      dark: 'Плотность панелей',
      values: ['Прозрачные', 'Лёгкие', 'Средние', 'Плотные', 'Сплошные'],
    },
    veil: {
      light: 'Осветление фона',
      dark: 'Затемнение фона',
      values: ['Нет', 'Лёгкое', 'Среднее', 'Сильное', 'Максимум'],
    },
    blur: {
      light: 'Размытие фона',
      dark: 'Размытие фона',
      values: ['Нет', 'Лёгкое', 'Среднее', 'Сильное', 'Максимум'],
    },
  },
  accent: 'Акцент',
  reset: 'Сбросить тему',
  readability: {
    excellent: 'Текст читается отлично',
    good: 'Текст читается хорошо',
    pending: 'Проверяем читаемость…',
  },
  raised: 'Для читаемости поднято',
  unreadable: 'На этом фоне текст будет плохо читаться',
};

const EN: StandaloneLabels = {
  isRussian: false,
  openSettings: 'Appearance',
  title: 'Appearance',
  editedTheme: 'Theme',
  light: 'Light',
  dark: 'Dark',
  background: 'Background',
  wallpaper: 'Wallpaper',
  color: 'Color',
  noBackground: 'None',
  levels: {
    glass: {
      light: 'Panel density',
      dark: 'Panel density',
      values: ['Clear', 'Light', 'Medium', 'Dense', 'Solid'],
    },
    veil: {
      light: 'Lighten background',
      dark: 'Darken background',
      values: ['Off', 'Soft', 'Medium', 'Strong', 'Max'],
    },
    blur: {
      light: 'Background blur',
      dark: 'Background blur',
      values: ['Off', 'Soft', 'Medium', 'Strong', 'Max'],
    },
  },
  accent: 'Accent',
  reset: 'Reset theme',
  readability: {
    excellent: 'Text is easy to read',
    good: 'Text is readable',
    pending: 'Checking readability…',
  },
  raised: 'Raised for readability',
  unreadable: 'Text would be hard to read on this background',
};

export const getStandaloneLabels = (): StandaloneLabels => {
  const language = (
    document.documentElement.lang ||
    navigator.language ||
    'en'
  ).toLowerCase();

  return language.startsWith('ru') ? RU : EN;
};
