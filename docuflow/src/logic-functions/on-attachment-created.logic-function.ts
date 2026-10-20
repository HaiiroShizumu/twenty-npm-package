import { defineLogicFunction } from 'twenty-sdk/define';
import {
  enqueueJobs,
  type DatabaseEventBatchPayload,
  type ObjectRecordCreateEvent,
} from 'twenty-sdk/logic-function';

import { getAttachmentTarget, readFileItems } from 'src/shared/documents/attachment-target.util';
import { isAppEngine } from 'src/shared/engine';
import {
  CAPTURE_FILE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  ON_ATTACHMENT_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

// A file attached to any record (company, deal, task of a process, a custom
// object) goes to documents. Copying is slow, so each file is a queued job
// named after the file: a repeated event does not copy it twice.
const handler = async (
  batch: DatabaseEventBatchPayload<ObjectRecordCreateEvent<Record<string, unknown>>>,
) => {
  if (!isAppEngine()) {
    return { skipped: 'FORK_ENGINE' };
  }

  const jobs = batch.events.flatMap((event) => {
    const attachment = event.properties.after ?? {};
    const target = getAttachmentTarget(attachment);

    if (target === undefined) {
      return [];
    }

    return readFileItems(attachment.file).map((file) => ({
      payload: {
        attachmentId: event.recordId,
        fileId: file.fileId,
        label: file.label,
        sourceObjectName: target.objectNameSingular,
        sourceRecordId: target.recordId,
        workspaceMemberId: event.workspaceMemberId ?? null,
      },
      jobId: `capture-${file.fileId}`,
    }));
  });

  if (jobs.length > 0) {
    await enqueueJobs({
      logicFunctionUniversalIdentifier: CAPTURE_FILE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
      jobs,
      retryLimit: 3,
    });
  }

  return { queuedFileCount: jobs.length };
};

export default defineLogicFunction({
  universalIdentifier: ON_ATTACHMENT_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-on-attachment-created',
  description: 'Ставит в очередь сбор вложенных файлов в документы',
  timeoutSeconds: 15,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'attachment.created',
    batchMode: true,
  },
});
