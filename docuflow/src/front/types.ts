export type WorkspaceMember = {
  id: string;
  userId?: string | null;
  name?: { firstName?: string | null; lastName?: string | null } | null;
};

export type DocflowTask = {
  id: string;
  title?: string | null;
  status?: string | null;
  dueAt?: string | null;
  createdAt: string;
  assigneeId?: string | null;
  smbInstruction?: string | null;
  smbFormSchema?: unknown;
  smbFormValues?: unknown;
  smbWorkflowRunId?: string | null;
  smbWorkflowThreadId?: string | null;
};

export type FileValue = { fileId: string; label: string; url?: string };

export type DocflowDocument = {
  id: string;
  name?: string | null;
  status?: string | null;
  documentType?: string | null;
  number?: string | null;
  documentDate?: string | null;
  validUntil?: string | null;
  description?: string | null;
  origin?: string | null;
  sourceObjectName?: string | null;
  sourceRecordId?: string | null;
  sourceRecordName?: string | null;
  workflowRunId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  folderId?: string | null;
  file?: FileValue[] | null;
  author?: WorkspaceMember | null;
  counterparty?: { id: string; name?: string | null } | null;
};

export type DocumentFolder = {
  id: string;
  name?: string | null;
  parentFolderId?: string | null;
};
