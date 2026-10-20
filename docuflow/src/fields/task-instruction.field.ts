import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_INSTRUCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Что и как сделать по заданию. Свои поля задания для заполнения лежат в
// форме задачи (smb.taskOptions, ADR-024), не здесь.
export default defineField({
  universalIdentifier: TASK_INSTRUCTION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.TEXT,
  name: 'smbInstruction',
  label: 'Инструкция',
  icon: 'IconInfoCircle',
  isNullable: true,
  defaultValue: null,
});
