import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  TASK_FORM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  TASK_RECORD_DOCFLOW_TAB_UNIVERSAL_IDENTIFIER,
  TASK_RECORD_DOCFLOW_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// "Задание" tab on the standard task page: instruction, the task's own fields
// and completing it, the same panel as on the docflow page.
export default definePageLayoutTab({
  universalIdentifier: TASK_RECORD_DOCFLOW_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.taskRecordPage.universalIdentifier,
  title: 'Задание',
  position: 50,
  icon: 'IconChecklist',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: TASK_RECORD_DOCFLOW_WIDGET_UNIVERSAL_IDENTIFIER,
      title: ' ',
      type: 'FRONT_COMPONENT',
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: TASK_FORM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});
