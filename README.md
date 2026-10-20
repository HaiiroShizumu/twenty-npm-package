# twenty-npm-package

Исходники npm-пакетов NorDiv для Twenty CRM. Каждая папка — самостоятельный проект.

| Папка | Пакет | Что это |
|---|---|---|
| `interface/` | `@haiiro/interface` | Скин: обои, стеклянные панели, акцент, проверка читаемости; установщик `nordiv-skin` для собранного фронта Twenty |
| `chats/` | `@haiiro/chats` | Приложение Twenty «Чаты»: личные и групповые беседы, чаты записей и задач |
| `docuflow/` | `@haiiro/docuflow` | Приложение Twenty «Документооборот»: документы, процессы и задания |

## Разработка

`interface/`:

```bash
cd interface
npm install
npm test && npm run typecheck
node scripts/stage-publish.mjs   # сборка и копия для публикации в .publish/
npm publish .publish
```

`chats/` и `docuflow/` (приложения Twenty, Yarn через corepack):

```bash
cd chats
corepack enable && yarn install
yarn twenty dev:build
yarn twenty app:publish
```

Подробности — в README каждой папки.

## Установка в CRM и выпуск

Настройки — в `.env` (образец `.env.example`, сам файл в git не попадает): `CRM_URL`, `CRM_API_KEY`
(ключ API CRM), `NPM_TOKEN`, `TWENTY_CONTAINER` или `TWENTY_FRONT_DIR` для скина.

```bash
node scripts/reinstall.mjs --local           # собрать из этих исходников и поставить в CRM (версия x.y.z-dev.<время>)
node scripts/reinstall.mjs                   # поставить последние версии из npm
node scripts/reinstall.mjs docuflow --clean  # сначала удалить приложение из CRM (данные тоже)
node scripts/publish.mjs --dry-run           # проверки, сборка, состав пакетов без публикации
node scripts/publish.mjs docuflow            # опубликовать в npm, версия +patch (--bump minor|major|x.y.z)
```

Порядок работы: правка исходников → `reinstall --local` и проверка в CRM → коммит → `publish.mjs`
→ коммит с новыми версиями. В npm уходит только собранное из этого репозитория.
