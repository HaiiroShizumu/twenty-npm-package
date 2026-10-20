// An attachment points at the record it is attached to through one of its
// target<Object>Id columns (targetCompanyId, targetTaskId, target<custom>Id).
// The file belongs to that record, not to the attachment.
const TARGET_KEY_PATTERN = /^target([A-Z][A-Za-z0-9]*)Id$/;

export const getAttachmentTarget = (
  attachment: Record<string, unknown>,
): { objectNameSingular: string; recordId: string } | undefined => {
  for (const [key, value] of Object.entries(attachment)) {
    const match = TARGET_KEY_PATTERN.exec(key);

    if (match !== null && typeof value === 'string' && value.length > 0) {
      const [first, ...rest] = match[1];

      return {
        objectNameSingular: `${first.toLowerCase()}${rest.join('')}`,
        recordId: value,
      };
    }
  }

  return undefined;
};

export type FileItem = { fileId: string; label: string; url?: string };

export const readFileItems = (value: unknown): FileItem[] =>
  Array.isArray(value)
    ? value.flatMap((item: unknown) => {
        if (typeof item !== 'object' || item === null) {
          return [];
        }

        const { fileId, label, url } = item as Record<string, unknown>;

        return typeof fileId === 'string' && fileId.length > 0 && typeof label === 'string'
          ? [{ fileId, label, url: typeof url === 'string' ? url : undefined }]
          : [];
      })
    : [];

// "Договор 12.pdf" → "Договор 12".
export const getDocumentNameFromFile = (fileName: string): string => {
  const extensionStart = fileName.lastIndexOf('.');

  return extensionStart > 0 ? fileName.slice(0, extensionStart) : fileName;
};

export const formatRecordLabel = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === 'object' && value !== null) {
    const { firstName, lastName } = value as Record<string, unknown>;
    const fullName = [firstName, lastName]
      .filter((part): part is string => typeof part === 'string' && part.length > 0)
      .join(' ');

    return fullName.length > 0 ? fullName : undefined;
  }

  return undefined;
};
