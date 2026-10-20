import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
} from 'twenty-sdk/define';

import {
  DOCUMENT_FOLDER_OBJECT_UNIVERSAL_IDENTIFIER,
  DOCUMENT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// "Удалить" on the docflow pages: documents, folders, tasks and processes go to the
// Twenty trash (restorable); nothing is destroyed for good.
const SOFT_DELETABLE_OBJECT_UNIVERSAL_IDENTIFIERS = [
  DOCUMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  DOCUMENT_FOLDER_OBJECT_UNIVERSAL_IDENTIFIER,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workflow.universalIdentifier,
];

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
  objectPermissions: SOFT_DELETABLE_OBJECT_UNIVERSAL_IDENTIFIERS.map((objectUniversalIdentifier) => ({
    objectUniversalIdentifier,
    canReadObjectRecords: true,
    canUpdateObjectRecords: true,
    canSoftDeleteObjectRecords: true,
    canDestroyObjectRecords: false,
  })),
  // UPLOAD_FILE and DOWNLOAD_FILE: collecting a file into documents reads
  // the attachment's file and uploads the document's own copy. Without them
  // the copy silently never happens on a stock Twenty.
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.WORKFLOWS,
    SystemPermissionFlag.UPLOAD_FILE,
    SystemPermissionFlag.DOWNLOAD_FILE,
  ],
});
