# @haiiro/interface

Скин NorDiv для Twenty CRM: обои, стеклянные панели, акцент и шрифт Manrope. Настройки
ограничены готовыми режимами, а читаемость текста проверяется при каждом изменении.

## Что внутри

- `src/` — движок без React: типы настроек, уровни, проверка читаемости
  (`resolveSkinProfile`, `getSkinLevelOptions`), применение к `<html>` (`applySkin`),
  замер обоев (`sampleSkinBackdrop`).
- `styles/index.css` — весь CSS скина. Правила включаются атрибутом `data-skin="smb"` на `<html>`.
- `src/standalone/` — автономный режим для обычного Twenty: кнопка «Оформление» и панель настроек.
- `bin/nordiv-skin.mjs` — установщик в собранный фронт Twenty.

## Настройки

У светлой и тёмной темы свои профили:

| Настройка | Режимы |
|---|---|
| Фон | обои, сплошной цвет, без фона |
| Плотность панелей | Прозрачные, Лёгкие, Средние, Плотные, Сплошные |
| Осветление (светлая) / затемнение (тёмная) фона | Нет, Лёгкое, Среднее, Сильное, Максимум |
| Размытие фона | Нет, Лёгкое, Среднее, Сильное, Максимум |

Сплошной цвет удерживается в диапазоне яркости своей темы. Без фона панели сплошные. Акцент
подстраивается под каждую тему. Если на выбранном фоне текст читается хуже порогов WCAG
(4,5:1 для основного текста, 3:1 для приглушённого и заголовков), движок поднимает плотность,
затем вуаль. Выбранный уровень он не понижает. Варианты, которые всё равно были бы подняты,
в настройках недоступны.

## Установка в обычный Twenty

```bash
yarn build                                    # dist/standalone и dist/index.js
npx nordiv-skin install /app/packages/twenty-server/dist/front
npx nordiv-skin uninstall /app/packages/twenty-server/dist/front
```

Установщик копирует `skin.css`, `standalone.js` и шрифты в `nordiv-skin/`, обои в `wallpapers/`
и вставляет два тега в `index.html` между маркерами `nordiv-skin:start/end`. На обычном Twenty
меняются палитра, шрифт, стекло страниц и навигации, фон и акцент. Раскладка (рейл, верхняя
панель, вкладки разделов) есть только в форке NorDiv: это React-компоненты, встроенные в ядро.
Настройки хранятся в `localStorage` (`nordiv-skin.settings`).

## Использование как библиотеки

```ts
import { applySkin, normalizeSkinSettings, sampleSkinBackdrop } from '@haiiro/interface';
import '@haiiro/interface/styles/index.css';

const settings = normalizeSkinSettings(storedValue);
const background = settings.dark.background;
const sample = background.kind === 'image' ? await sampleSkinBackdrop(background.url) : null;

applySkin({ root: document.documentElement, mode: 'dark', settings, sample });
```

Выпуск версии: `node scripts/stage-publish.mjs`, затем `npm publish .publish --otp <код>`.

Решение и ограничения — `docs/adr/ADR-028-skin-package.md`.
