import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { restEq } from 'src/shared/api/rest-filter.util';
import { readRestList, readRestRecord } from 'src/shared/api/rest-response.util';
import {
  formatRecordLabel,
  getDocumentNameFromFile,
  readFileItems,
} from 'src/shared/documents/attachment-target.util';
import { getObjectSummaries } from 'src/shared/api/object-summaries';
import { getTask, restClient } from 'src/server/records';
import { logDocflow } from 'src/shared/log.util';
import { DOCUMENT_FILE_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

export type FileCapture = {
  attachmentId: string;
  fileId: string;
  label: string;
  sourceObjectName: string;
  sourceRecordId: string;
  workspaceMemberId: string | null;
};

export type CaptureResult = 'CREATED' | 'ALREADY_CAPTURED' | 'FILE_GONE';

const findSourceRecordName = async (
  objectName: string,
  recordId: string,
): Promise<string | null> => {
  const summary = (await getObjectSummaries()).get(objectName);

  if (summary === undefined || summary.labelFieldName === undefined) {
    return null;
  }

  const record = readRestRecord<Record<string, unknown>>(
    await restClient('application')
      .get(`/rest/${summary.namePlural}/${recordId}`)
      .catch(() => null),
  );
  const label = formatRecordLabel(record?.[summary.labelFieldName]);

  return label === undefined ? summary.labelSingular : `${summary.labelSingular}: ${label}`;
};

// The document keeps its own copy of the file: a file belongs to one FILES
// field, and the archive must outlive the record it came from.
export const captureFile = async (capture: FileCapture): Promise<CaptureResult> => {
  const existing = readRestList<{ id: string }>(
    await restClient('application').get('/rest/smbDocuments', {
      query: { filter: restEq('sourceFileId', capture.fileId), limit: 1 },
    }),
  ).records;

  if (existing.length > 0) {
    logDocflow('capture: already a document', { fileId: capture.fileId });

    return 'ALREADY_CAPTURED';
  }

  const attachment = readRestRecord<Record<string, unknown>>(
    await restClient('application').get(`/rest/attachments/${capture.attachmentId}`),
  );
  const file = readFileItems(attachment?.file).find(
    (item) => item.fileId === capture.fileId,
  );

  if (file?.url === undefined) {
    logDocflow('capture: file is gone from the attachment', {
      attachmentId: capture.attachmentId,
      fileId: capture.fileId,
      attachmentFound: attachment !== undefined,
    });

    return 'FILE_GONE';
  }

  const download = await fetch(file.url);

  if (!download.ok) {
    throw new Error(`The file of attachment ${capture.attachmentId} could not be read (${download.status})`);
  }

  const uploaded = await new MetadataApiClient().uploadFile({
    fileBuffer: Buffer.from(await download.arrayBuffer()),
    filename: capture.label,
    fieldMetadataUniversalIdentifier: DOCUMENT_FILE_UNIVERSAL_IDENTIFIER,
  });

  const workflowRunId =
    capture.sourceObjectName === 'task'
      ? ((await getTask('application', capture.sourceRecordId))?.smbWorkflowRunId || null)
      : null;

  await restClient('application').post('/rest/smbDocuments', {
    name: getDocumentNameFromFile(capture.label),
    file: [{ fileId: uploaded.id, label: capture.label }],
    origin: workflowRunId !== null ? 'PROCESS' : 'RECORD',
    sourceObjectName: capture.sourceObjectName,
    sourceRecordId: capture.sourceRecordId,
    sourceRecordName: await findSourceRecordName(
      capture.sourceObjectName,
      capture.sourceRecordId,
    ),
    sourceFileId: capture.fileId,
    workflowRunId,
    authorId: capture.workspaceMemberId,
  });

  logDocflow('capture: document created', {
    fileId: capture.fileId,
    source: `${capture.sourceObjectName}/${capture.sourceRecordId}`,
  });

  return 'CREATED';
};
