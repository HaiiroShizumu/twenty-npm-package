// Profile of the Bitrix24 employee who opened the application. Only the
// e-mail is required to find or invite them in Twenty; the rest fills the
// workspace member card when they already exist.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BitrixPerson = {
  bitrixUserId: string;
  email?: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
};

const readText = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];

  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
};

export const parseBitrixPerson = (value: unknown): BitrixPerson | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const rawId = record.ID;
  const bitrixUserId =
    typeof rawId === 'number' ? String(rawId) : readText(record, 'ID');

  if (bitrixUserId.length === 0) {
    return undefined;
  }

  const email = readText(record, 'EMAIL').toLowerCase();

  return {
    bitrixUserId,
    email: EMAIL_PATTERN.test(email) ? email : undefined,
    firstName: readText(record, 'NAME'),
    lastName: readText(record, 'LAST_NAME'),
    jobTitle: readText(record, 'WORK_POSITION'),
  };
};
