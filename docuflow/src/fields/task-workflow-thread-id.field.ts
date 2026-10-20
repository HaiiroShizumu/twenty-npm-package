import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_WORKFLOW_THREAD_ID_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// По нему ответ задания будит процесс. Пишет движок приложения (DOCFLOW_ENGINE = APP); форк хранит то же
// в smb.taskOptions.
export default defineField({
  universalIdentifier: TASK_WORKFLOW_THREAD_ID_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.TEXT,
  name: 'smbWorkflowThreadId',
  label: 'Ожидание шага',
  icon: 'IconHourglass',
  isNullable: true,
  defaultValue: null,
});
