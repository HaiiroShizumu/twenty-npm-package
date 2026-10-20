import {
  defineCommandMenuItem,
  numberOfSelectedRecords,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  PROCESS_STEPS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  WORKFLOW_STEPS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// "Запуск и задания" of a process — the parameters asked before the launch
// and who fills each "Human input" step — opens from the command menu of the
// workflow in the side panel. As a tab of the workflow page it took a column
// of the workflow editor on every process, used or not.
export default defineCommandMenuItem({
  universalIdentifier: WORKFLOW_STEPS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Запуск и задания',
  shortLabel: 'Запуск и задания',
  icon: 'IconPlayerPlay',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workflow.universalIdentifier,
  frontComponentUniversalIdentifier: PROCESS_STEPS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1,
});
