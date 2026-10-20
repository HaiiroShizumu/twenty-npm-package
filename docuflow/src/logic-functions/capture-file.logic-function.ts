import { defineLogicFunction } from 'twenty-sdk/define';

import { captureFile, type FileCapture } from 'src/server/document-capture';
import { CAPTURE_FILE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const isFileCapture = (payload: Partial<FileCapture>): payload is FileCapture =>
  typeof payload.attachmentId === 'string' &&
  typeof payload.fileId === 'string' &&
  typeof payload.label === 'string' &&
  typeof payload.sourceObjectName === 'string' &&
  typeof payload.sourceRecordId === 'string';

const handler = async (payload: Partial<FileCapture>) => {
  if (!isFileCapture(payload)) {
    return { status: 'INVALID_PAYLOAD' };
  }

  return {
    status: await captureFile({
      ...payload,
      workspaceMemberId: payload.workspaceMemberId ?? null,
    }),
  };
};

export default defineLogicFunction({
  universalIdentifier: CAPTURE_FILE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-capture-file',
  description: 'Копирует вложенный файл в документы с источником',
  timeoutSeconds: 120,
  handler,
});
