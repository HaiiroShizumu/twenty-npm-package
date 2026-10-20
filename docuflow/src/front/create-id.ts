// Ids of form fields built in the browser. The sandbox of a front component
// exposes `crypto` through a proxy: randomUUID can look like a function and
// still throw "is not a function" (and outside a secure context it is absent),
// so every source is tried in turn, down to Math.random — these ids only need
// to be unique within one form.
const formatUuid = (bytes: Uint8Array): string => {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const randomBytes = (): Uint8Array => {
  try {
    return crypto.getRandomValues(new Uint8Array(16));
  } catch {
    return Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  }
};

export const createId = (): string => {
  try {
    const id = crypto.randomUUID();

    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  } catch {
    // Falls through to the random bytes
  }

  return formatUuid(randomBytes());
};
