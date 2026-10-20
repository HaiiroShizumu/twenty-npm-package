import { describe, expect, it } from 'vitest';

import {
  type ConversationRecord,
  type MessageRecord,
} from 'src/shared/conversation.type';
import {
  getConversationTitle,
  sortConversations,
  toConversationView,
} from 'src/shared/conversation-view';
import { getMessengerEngine } from 'src/shared/engine';
import { buildDirectKey, buildRecordKey } from 'src/shared/keys';
import { buildMessageBody } from 'src/shared/message-body';
import { insertWithNextSeq } from 'src/shared/message-numbering';

const conversation = (
  overrides: Partial<ConversationRecord> = {},
): ConversationRecord => ({
  id: 'c1',
  kind: 'GROUP',
  name: 'Отдел продаж',
  directKey: null,
  recordObjectName: null,
  recordId: null,
  recordKey: null,
  lastSeq: 5,
  lastMessageAt: '2026-10-19T10:00:00.000Z',
  creatorId: 'm1',
  createdAt: '2026-10-18T10:00:00.000Z',
  ...overrides,
});

const message = (overrides: Partial<MessageRecord> = {}): MessageRecord => ({
  id: 'x5',
  conversationId: 'c1',
  seq: 5,
  seqKey: 'c1:5',
  kind: 'TEXT',
  authorId: 'm2',
  body: null,
  text: 'Привет',
  clientMessageId: 'k',
  clientKey: 'c1:k',
  editedAt: null,
  removedAt: null,
  createdAt: '2026-10-19T10:00:00.000Z',
  ...overrides,
});

describe('keys', () => {
  it('builds the same direct key whoever starts the conversation', () => {
    expect(buildDirectKey('b', 'a')).toBe('a:b');
    expect(buildDirectKey('a', 'b')).toBe('a:b');
  });

  it('keys a record chat by object and record like the fork', () => {
    expect(buildRecordKey('task', 't1')).toBe('task:t1');
  });
});

describe('buildMessageBody', () => {
  it('turns lines into the paragraphs of an editor document', () => {
    expect(buildMessageBody('  Первая\r\n\nТретья ')).toEqual({
      status: 'OK',
      text: 'Первая\n\nТретья',
      body: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Первая' }] },
          { type: 'paragraph' },
          { type: 'paragraph', content: [{ type: 'text', text: 'Третья' }] },
        ],
      },
    });
  });

  it('refuses an empty or too long message', () => {
    expect(buildMessageBody('  \n ').status).toBe('EMPTY');
    expect(buildMessageBody('я'.repeat(10_001)).status).toBe('TOO_LONG');
  });
});

describe('insertWithNextSeq', () => {
  it('takes the next number when a concurrent sender got this one', async () => {
    const largest = [4, 5];
    const result = await insertWithNextSeq(
      {
        findLargestSeq: async () => largest.shift() ?? 0,
        insertWithSeq: async (seq) =>
          seq === 5 ? undefined : `message-${seq}`,
        findSameSend: async () => undefined,
      },
      5,
    );

    expect(result).toEqual({
      status: 'INSERTED',
      message: 'message-6',
      seq: 6,
    });
  });

  it('returns the stored message of a repeated send', async () => {
    const result = await insertWithNextSeq(
      {
        findLargestSeq: async () => 7,
        insertWithSeq: async () => undefined,
        findSameSend: async () => 'message-7',
      },
      5,
    );

    expect(result).toEqual({ status: 'ALREADY_SENT', message: 'message-7' });
  });

  it('gives up after the allowed attempts', async () => {
    await expect(
      insertWithNextSeq(
        {
          findLargestSeq: async () => 1,
          insertWithSeq: async () => undefined,
          findSameSend: async () => undefined,
        },
        2,
      ),
    ).rejects.toThrow();
  });
});

describe('conversation view', () => {
  it('counts unread messages from the viewer read position', () => {
    const view = toConversationView({
      conversation: conversation(),
      members: [
        {
          id: 'p1',
          memberKey: 'c1:m1',
          conversationId: 'c1',
          workspaceMemberId: 'm1',
          memberRole: 'OWNER',
          lastReadSeq: 2,
          mutedUntil: null,
        },
        {
          id: 'p2',
          memberKey: 'c1:m2',
          conversationId: 'c1',
          workspaceMemberId: 'm2',
          memberRole: 'MEMBER',
          lastReadSeq: 5,
          mutedUntil: null,
        },
      ],
      viewerWorkspaceMemberId: 'm1',
      lastMessage: message(),
    });

    expect(view).toMatchObject({
      lastReadSeq: 2,
      unreadCount: 3,
      memberIds: ['m1', 'm2'],
    });
    expect(view.lastMessage?.text).toBe('Привет');
  });

  it('hides the text of a removed message', () => {
    const view = toConversationView({
      conversation: conversation(),
      members: [],
      viewerWorkspaceMemberId: 'm1',
      lastMessage: message({
        text: 'секрет',
        removedAt: '2026-10-19T11:00:00.000Z',
      }),
    });

    expect(view.lastMessage).toMatchObject({ text: '', isRemoved: true });
  });

  it('puts the freshest conversation first', () => {
    const older = toConversationView({
      conversation: conversation({
        id: 'old',
        lastMessageAt: '2026-10-01T00:00:00.000Z',
      }),
      members: [],
      viewerWorkspaceMemberId: 'm1',
      lastMessage: undefined,
    });
    const fresh = toConversationView({
      conversation: conversation({
        id: 'new',
        lastMessageAt: null,
        createdAt: '2026-10-19T12:00:00.000Z',
      }),
      members: [],
      viewerWorkspaceMemberId: 'm1',
      lastMessage: undefined,
    });

    expect(sortConversations([older, fresh]).map(({ id }) => id)).toEqual([
      'new',
      'old',
    ]);
  });

  it('names a direct conversation after the colleague', () => {
    const view = toConversationView({
      conversation: conversation({ kind: 'DIRECT', name: null }),
      members: [
        {
          id: 'p1',
          memberKey: null,
          conversationId: 'c1',
          workspaceMemberId: 'm1',
          memberRole: 'MEMBER',
          lastReadSeq: 0,
          mutedUntil: null,
        },
        {
          id: 'p2',
          memberKey: null,
          conversationId: 'c1',
          workspaceMemberId: 'm2',
          memberRole: 'MEMBER',
          lastReadSeq: 0,
          mutedUntil: null,
        },
      ],
      viewerWorkspaceMemberId: 'm1',
      lastMessage: undefined,
    });

    expect(
      getConversationTitle({
        conversation: view,
        viewerWorkspaceMemberId: 'm1',
        getMemberName: (memberId) => (memberId === 'm2' ? 'Анна Петрова' : '?'),
      }),
    ).toBe('Анна Петрова');
  });
});

describe('engine', () => {
  it('runs on the app unless the fork is chosen', () => {
    expect(getMessengerEngine(undefined)).toBe('APP');
    expect(getMessengerEngine('FORK')).toBe('FORK');
  });
});
