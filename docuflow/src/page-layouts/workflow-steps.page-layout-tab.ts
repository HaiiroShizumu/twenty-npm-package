import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  PROCESS_STEPS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  WORKFLOW_RECORD_STEPS_TAB_UNIVERSAL_IDENTIFIER,
  WORKFLOW_RECORD_STEPS_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// "Запуск и задания" tab on the standard workflow page: the parameters asked
// before the launch, and who fills each "Human input" step, by when, which
// fields are required.
export default definePageLayoutTab({
  universalIdentifier: WORKFLOW_RECORD_STEPS_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.workflowRecordPage.universalIdentifier,
  title: 'Запуск и задания',
  position: 50,
  icon: 'IconPlayerPlay',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: WORKFLOW_RECORD_STEPS_WIDGET_UNIVERSAL_IDENTIFIER,
      title: ' ',
      type: 'FRONT_COMPONENT',
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: PROCESS_STEPS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});
