import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_WORKFLOW_RUN_ID_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Запуск процесса, выдавший задание. Пишет движок приложения (DOCFLOW_ENGINE = APP); форк хранит то же
// в smb.taskOptions.
export default defineField({
  universalIdentifier: TASK_WORKFLOW_RUN_ID_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.TEXT,
  name: 'smbWorkflowRunId',
  label: 'Запуск процесса',
  icon: 'IconTopologyStar3',
  isNullable: true,
  defaultValue: null,
});
