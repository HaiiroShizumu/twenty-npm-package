import { afterEach, describe, expect, it, vi } from 'vitest';

import { createClientMessageId } from 'src/front/create-client-message-id';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('createClientMessageId', () => {
  it('builds a v4 id where the page has no crypto.randomUUID (plain http)', () => {
    const realCrypto = globalThis.crypto;

    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => realCrypto.getRandomValues(bytes),
    });

    const first = createClientMessageId();

    expect(first).toMatch(UUID_V4);
    expect(createClientMessageId()).not.toBe(first);
  });

  it('uses crypto.randomUUID where the page has it', () => {
    expect(createClientMessageId()).toMatch(UUID_V4);
  });
});
