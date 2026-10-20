import { definePageLayout } from 'twenty-sdk/define';

import { buildDocflowTab } from 'src/page-layouts/build-docflow-tab';
import {
  TASKS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  DOCFLOW_TASKS_TAB_UNIVERSAL_IDENTIFIER,
  DOCFLOW_TASKS_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// "Задания" of the "Документооборот" folder: the layout and tab of the former
// three-tab docflow page.
export default definePageLayout({
  universalIdentifier: DOCFLOW_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Задания',
  type: 'STANDALONE_PAGE',
  tabs: [
    buildDocflowTab({
      universalIdentifier: DOCFLOW_TASKS_TAB_UNIVERSAL_IDENTIFIER,
      widgetUniversalIdentifier: DOCFLOW_TASKS_WIDGET_UNIVERSAL_IDENTIFIER,
      frontComponentUniversalIdentifier: TASKS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      title: 'Задания',
      icon: 'IconChecklist',
      position: 0,
    }),
  ],
});
