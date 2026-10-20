import { defineApplication, FieldType } from 'twenty-sdk/define';

import { MESSENGER_ENGINE_VARIABLE_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Тот же идентификатор стоит в манифесте модуля форка
// (twenty-front/src/modules/smb-conversations/manifest.ts) и в серверном
// реестре модулей: мессенджер включён в компании, когда установлено это App.
export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '6f0c1c4e-3b0d-4d0c-9d0a-5a6c1f2e7b10';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Чаты',
  description:
    'Личные и групповые беседы, чаты записей, задач и запусков процессов',
  author: 'NorDiv',
  logo: 'public/logo.svg',
  galleryImages: ['public/cover.svg'],
  applicationVariables: {
    MESSENGER_ENGINE: {
      universalIdentifier: MESSENGER_ENGINE_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Кто ведёт беседы',
      description:
        'APP — беседы ведут функции и страницы приложения. FORK — сервер и раздел «Чаты» NorDiv; страница и функции приложения тогда не работают, чтобы не было двух мессенджеров.',
      type: FieldType.SELECT,
      options: [
        { label: 'Функции и страницы приложения', value: 'APP' },
        { label: 'Сервер NorDiv', value: 'FORK' },
      ],
      value: 'APP',
      isSecret: false,
    },
  },
});
