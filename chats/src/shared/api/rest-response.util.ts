export type RestPageInfo = {
  hasNextPage?: boolean;
  endCursor?: string | null;
};

export type RestList<TRecord> = {
  records: TRecord[];
  pageInfo: RestPageInfo;
};

type RestEnvelope = {
  data?: Record<string, unknown>;
  pageInfo?: RestPageInfo;
};

// Every REST answer carries its records under one key of `data`
// (`tasks`, `createTask`, `updateTask`...): the shape is read once here.
const readDataValue = (response: unknown): unknown => {
  const data = (response as RestEnvelope | null)?.data;

  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  return Object.values(data)[0];
};

export const readRestList = <TRecord>(response: unknown): RestList<TRecord> => {
  const value = readDataValue(response);

  return {
    records: Array.isArray(value) ? (value as TRecord[]) : [],
    pageInfo: (response as RestEnvelope | null)?.pageInfo ?? {},
  };
};

export const readRestRecord = <TRecord>(
  response: unknown,
): TRecord | undefined => {
  const value = readDataValue(response);

  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as TRecord)
    : undefined;
};
