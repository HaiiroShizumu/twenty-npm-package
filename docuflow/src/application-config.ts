import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  BITRIX_CLIENT_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
  BITRIX_CLIENT_SECRET_VARIABLE_UNIVERSAL_IDENTIFIER,
  CRM_PUBLIC_URL_VARIABLE_UNIVERSAL_IDENTIFIER,
  DOCFLOW_ENGINE_VARIABLE_UNIVERSAL_IDENTIFIER,
  WORKSPACE_INVITE_HASH_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// The same identifier stands in the fork's module manifest
// (twenty-front/src/modules/smb-docflow/manifest.ts): one application, whether
// it runs on the NorDiv server or on its own.
export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '0b7d5d2e-8c4f-4a59-9a43-2f6f1c3e9d21';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Документооборот',
  description:
    'Задания с полями для заполнения, процессы с запуском по параметрам, документы со всех записей, приложение Битрикс24',
  author: 'NorDiv',
  logo: 'public/logo.svg',
  galleryImages: ['public/cover.svg'],
  applicationVariables: {
    DOCFLOW_ENGINE: {
      universalIdentifier: DOCFLOW_ENGINE_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Кто выполняет серверную работу',
      description:
        'APP — серверную работу делают функции приложения. FORK — её делает сервер NorDiv; функции приложения тогда ничего не делают, чтобы не было двойной работы.',
      type: FieldType.SELECT,
      options: [
        { label: 'Функции приложения', value: 'APP' },
        { label: 'Сервер NorDiv', value: 'FORK' },
      ],
      value: 'APP',
      isSecret: false,
    },
    CRM_PUBLIC_URL: {
      universalIdentifier: CRM_PUBLIC_URL_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Адрес CRM компании',
      description:
        'Например https://acme.example.ru — ссылки из Битрикс24 ведут сюда.',
      isSecret: false,
    },
    BITRIX_CLIENT_ID: {
      universalIdentifier: BITRIX_CLIENT_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Битрикс24: код приложения (client_id)',
      description: 'Из карточки локального приложения на портале.',
      isSecret: false,
    },
    BITRIX_CLIENT_SECRET: {
      universalIdentifier: BITRIX_CLIENT_SECRET_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Битрикс24: ключ приложения (client_secret)',
      description: 'Из карточки локального приложения на портале.',
      isSecret: true,
    },
    WORKSPACE_INVITE_HASH: {
      universalIdentifier: WORKSPACE_INVITE_HASH_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Хеш приглашения в компанию',
      description:
        'Хвост ссылки «Пригласить» из настроек компании (…/invite/<этот-хвост>). Нужен, чтобы новый сотрудник из Битрикс24 попал на штатную регистрацию Twenty.',
      isSecret: false,
    },
  },
});
