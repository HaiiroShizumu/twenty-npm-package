import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_FORM_VALUES_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Что заполнено по заданию. Пишет движок приложения (DOCFLOW_ENGINE = APP); форк хранит то же
// в smb.taskOptions.
export default defineField({
  universalIdentifier: TASK_FORM_VALUES_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RAW_JSON,
  name: 'smbFormValues',
  label: 'Значения полей задания',
  icon: 'IconListCheck',
  isNullable: true,
  defaultValue: null,
});
