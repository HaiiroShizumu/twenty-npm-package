import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  DOCFLOW_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
  DOCFLOW_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DOCFLOW_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Задания',
  icon: 'IconChecklist',
  position: 0,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: DOCFLOW_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: DOCFLOW_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
});
