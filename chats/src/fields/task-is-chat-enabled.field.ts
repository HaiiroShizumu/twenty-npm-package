import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_IS_CHAT_ENABLED_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Чат задачи по умолчанию включён: он появляется, как только у задачи больше
// одного человека.
export default defineField({
  universalIdentifier: TASK_IS_CHAT_ENABLED_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.BOOLEAN,
  name: 'smbIsChatEnabled',
  label: 'Чат задачи',
  icon: 'IconMessages',
  defaultValue: true,
});
