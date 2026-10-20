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
