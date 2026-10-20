import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  DOCFLOW_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PROCESSES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  DOCFLOW_PROCESSES_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DOCFLOW_PROCESSES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Процессы',
  icon: 'IconTopologyStar3',
  position: 1,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: DOCFLOW_PROCESSES_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: DOCFLOW_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
});
