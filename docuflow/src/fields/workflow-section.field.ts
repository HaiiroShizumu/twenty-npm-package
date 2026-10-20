import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { WORKFLOW_SECTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Процессы документооборота — штатные процессы со значением DOCFLOW в этом
// поле (ADR-025 п.2): раздел «Процессы» показывает только их.
export default defineField({
  universalIdentifier: WORKFLOW_SECTION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workflow.universalIdentifier,
  type: FieldType.SELECT,
  name: 'smbSection',
  label: 'Раздел',
  icon: 'IconLayoutSidebar',
  defaultValue: "'CRM'",
  options: [
    {
      id: '21edc9de-7b3b-49be-a09f-4e7c93109c6e',
      value: 'CRM',
      label: 'CRM',
      position: 0,
      color: 'gray',
    },
    {
      id: '0ef2fa50-2a6e-412c-b1d9-35d318fb729b',
      value: 'DOCFLOW',
      label: 'Документооборот',
      position: 1,
      color: 'blue',
    },
  ],
});
