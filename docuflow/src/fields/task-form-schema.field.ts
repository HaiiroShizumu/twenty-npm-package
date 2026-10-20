import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_FORM_SCHEMA_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Поля, которые заполняют по заданию: формат шага «Человеческий ввод». Пишет движок приложения (DOCFLOW_ENGINE = APP); форк хранит то же
// в smb.taskOptions.
export default defineField({
  universalIdentifier: TASK_FORM_SCHEMA_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RAW_JSON,
  name: 'smbFormSchema',
  label: 'Поля задания',
  icon: 'IconForms',
  isNullable: true,
  defaultValue: null,
});
