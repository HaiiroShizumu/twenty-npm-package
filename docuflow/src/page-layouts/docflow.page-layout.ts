import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
} from 'twenty-sdk/define';

import {
  DOCFLOW_DOCUMENTS_TAB_UNIVERSAL_IDENTIFIER,
  DOCFLOW_DOCUMENTS_WIDGET_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PROCESSES_TAB_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PROCESSES_WIDGET_UNIVERSAL_IDENTIFIER,
  DOCFLOW_TASKS_TAB_UNIVERSAL_IDENTIFIER,
  DOCFLOW_TASKS_WIDGET_UNIVERSAL_IDENTIFIER,
  DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  TASKS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

const buildTab = ({
  universalIdentifier,
  widgetUniversalIdentifier,
  frontComponentUniversalIdentifier,
  title,
  icon,
  position,
}: {
  universalIdentifier: string;
  widgetUniversalIdentifier: string;
  frontComponentUniversalIdentifier: string;
  title: string;
  icon: string;
  position: number;
}) => ({
  universalIdentifier,
  title,
  position,
  icon,
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: widgetUniversalIdentifier,
      title: ' ',
      type: 'FRONT_COMPONENT' as const,
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      configuration: {
        configurationType: 'FRONT_COMPONENT' as const,
        frontComponentUniversalIdentifier,
      },
    },
  ],
});

// The docflow page of the sidebar: the same three sections as the fork's
// /docflow page, built from the app's front components.
export default definePageLayout({
  universalIdentifier: DOCFLOW_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Документооборот',
  type: 'STANDALONE_PAGE',
  tabs: [
    buildTab({
      universalIdentifier: DOCFLOW_TASKS_TAB_UNIVERSAL_IDENTIFIER,
      widgetUniversalIdentifier: DOCFLOW_TASKS_WIDGET_UNIVERSAL_IDENTIFIER,
      frontComponentUniversalIdentifier: TASKS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      title: 'Задания',
      icon: 'IconChecklist',
      position: 0,
    }),
    buildTab({
      universalIdentifier: DOCFLOW_PROCESSES_TAB_UNIVERSAL_IDENTIFIER,
      widgetUniversalIdentifier: DOCFLOW_PROCESSES_WIDGET_UNIVERSAL_IDENTIFIER,
      frontComponentUniversalIdentifier: PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      title: 'Процессы',
      icon: 'IconTopologyStar3',
      position: 1,
    }),
    buildTab({
      universalIdentifier: DOCFLOW_DOCUMENTS_TAB_UNIVERSAL_IDENTIFIER,
      widgetUniversalIdentifier: DOCFLOW_DOCUMENTS_WIDGET_UNIVERSAL_IDENTIFIER,
      frontComponentUniversalIdentifier: DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      title: 'Документы',
      icon: 'IconFileText',
      position: 2,
    }),
  ],
});
