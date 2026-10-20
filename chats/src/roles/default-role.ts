import { defineApplicationRole } from 'twenty-sdk/define';

// Функции читают и пишут беседы за человека, проверяя его участие сами:
// людям объекты бесед закрыты (readability APPLICATION). Читать нужно и
// сотрудников с задачами — для названий бесед и чатов задач.
export const DEFAULT_ROLE_UNIVERSAL_IDENTIFIER =
  '11e9feb6-4400-46a2-847f-a07ae0fb8396';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Мессенджер: функции приложения',
  description: 'Права серверных функций приложения «Мессенджер»',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
});
