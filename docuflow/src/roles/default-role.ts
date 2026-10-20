import {
  defineApplicationRole,
  SystemPermissionFlag,
} from 'twenty-sdk/define';

// What the app's functions may do when nobody is behind a run (record
// events, the Bitrix24 portal): hand out process tasks, collect documents.
// A run a person triggered is further narrowed to that person's rights.
export const DEFAULT_ROLE_UNIVERSAL_IDENTIFIER =
  '26b1dde8-4ed9-4f39-8516-e0dcb734ea5a';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Документооборот: функции приложения',
  description: 'Права серверных функций приложения «Документооборот»',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.WORKFLOWS],
});
