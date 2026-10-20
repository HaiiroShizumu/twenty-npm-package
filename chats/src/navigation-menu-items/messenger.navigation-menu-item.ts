import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  MESSENGER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  MESSENGER_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: MESSENGER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Чаты',
  icon: 'IconMessages',
  position: 0,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: MESSENGER_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
