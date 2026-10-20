import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_SECTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Задания документооборота — штатные задачи со значением DOCFLOW (ADR-025
// п.3). Задачам процессов документооборота его ставит сервер.
export default defineField({
  universalIdentifier: TASK_SECTION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.SELECT,
  name: 'smbSection',
  label: 'Раздел',
  icon: 'IconLayoutSidebar',
  defaultValue: "'CRM'",
  options: [
    {
      id: 'e2d2c204-0388-45e7-8eb2-fc02b0378812',
      value: 'CRM',
      label: 'CRM',
      position: 0,
      color: 'gray',
    },
    {
      id: '0f7bca41-dcd3-45b7-b0f9-55073f963edc',
      value: 'DOCFLOW',
      label: 'Документооборот',
      position: 1,
      color: 'blue',
    },
  ],
});
