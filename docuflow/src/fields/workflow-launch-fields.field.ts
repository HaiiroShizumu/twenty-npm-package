import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { WORKFLOW_LAUNCH_FIELDS_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Поля, которые человек заполняет перед запуском процесса, в формате шага
// «Человеческий ввод». Правятся конструктором в команде процесса «Запуск и задания».
export default defineField({
  universalIdentifier: WORKFLOW_LAUNCH_FIELDS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workflow.universalIdentifier,
  type: FieldType.RAW_JSON,
  name: 'smbLaunchFields',
  label: 'Параметры запуска',
  icon: 'IconPlayerPlay',
  isNullable: true,
  defaultValue: null,
});
