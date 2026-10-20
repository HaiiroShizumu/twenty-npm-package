import { definePageLayout } from 'twenty-sdk/define';

import { buildDocflowTab } from 'src/page-layouts/build-docflow-tab';
import {
  DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  DOCFLOW_DOCUMENTS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  DOCFLOW_DOCUMENTS_PAGE_TAB_UNIVERSAL_IDENTIFIER,
  DOCFLOW_DOCUMENTS_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// "Документы" of the "Документооборот" folder
export default definePageLayout({
  universalIdentifier: DOCFLOW_DOCUMENTS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Документы',
  type: 'STANDALONE_PAGE',
  tabs: [
    buildDocflowTab({
      universalIdentifier: DOCFLOW_DOCUMENTS_PAGE_TAB_UNIVERSAL_IDENTIFIER,
      widgetUniversalIdentifier: DOCFLOW_DOCUMENTS_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
      frontComponentUniversalIdentifier: DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      title: 'Документы',
      icon: 'IconFileText',
      position: 0,
    }),
  ],
});
