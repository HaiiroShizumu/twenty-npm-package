import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
} from 'twenty-sdk/define';

import {
  MESSENGER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  MESSENGER_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  MESSENGER_PAGE_TAB_UNIVERSAL_IDENTIFIER,
  MESSENGER_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default definePageLayout({
  universalIdentifier: MESSENGER_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Чаты',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: MESSENGER_PAGE_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Беседы',
      position: 0,
      icon: 'IconMessages',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: MESSENGER_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
          title: ' ',
          type: 'FRONT_COMPONENT',
          heightBehavior:
            PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              MESSENGER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
