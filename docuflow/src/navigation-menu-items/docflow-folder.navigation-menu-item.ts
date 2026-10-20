import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  DOCFLOW_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// The "Документооборот" folder of the sidebar: its sections are its items
export default defineNavigationMenuItem({
  universalIdentifier: DOCFLOW_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER,
  name: 'Документооборот',
  icon: 'IconFiles',
  position: 0,
  type: NavigationMenuItemType.FOLDER,
});
