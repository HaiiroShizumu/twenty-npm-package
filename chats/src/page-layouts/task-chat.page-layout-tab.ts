import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  TASK_CHAT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  TASK_RECORD_CHAT_TAB_UNIVERSAL_IDENTIFIER,
  TASK_RECORD_CHAT_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default definePageLayoutTab({
  universalIdentifier: TASK_RECORD_CHAT_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.taskRecordPage
      .universalIdentifier,
  title: 'Чат',
  position: 60,
  icon: 'IconMessages',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: TASK_RECORD_CHAT_WIDGET_UNIVERSAL_IDENTIFIER,
      title: ' ',
      type: 'FRONT_COMPONENT',
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier:
          TASK_CHAT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});
