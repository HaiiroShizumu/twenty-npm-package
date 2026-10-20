import { definePageLayout } from 'twenty-sdk/define';

import { buildDocflowTab } from 'src/page-layouts/build-docflow-tab';
import {
  PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PROCESSES_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PROCESSES_PAGE_TAB_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PROCESSES_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// "Процессы" of the "Документооборот" folder
export default definePageLayout({
  universalIdentifier: DOCFLOW_PROCESSES_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Процессы',
  type: 'STANDALONE_PAGE',
  tabs: [
    buildDocflowTab({
      universalIdentifier: DOCFLOW_PROCESSES_PAGE_TAB_UNIVERSAL_IDENTIFIER,
      widgetUniversalIdentifier: DOCFLOW_PROCESSES_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
      frontComponentUniversalIdentifier: PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      title: 'Процессы',
      icon: 'IconTopologyStar3',
      position: 0,
    }),
  ],
});
