import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseMessengerApiRequest } from 'src/server/messenger-api';
import { getTaskChatMemberIds } from 'src/server/task-chat';

const records = vi.hoisted(() => ({
  findMembership: vi.fn(),
  findMessageByKey: vi.fn(),
  findLargestSeq: vi.fn(),
  createMessage: vi.fn(),
  updateConversation: vi.fn(),
  updateMember: vi.fn(),
  getConversation: vi.fn(),
  getReadableRecord: vi.fn(),
  findConversationByRecordKey: vi.fn(),
  createConversation: vi.fn(),
  createMember: vi.fn(),
  findMembersOf: vi.fn(),
  findMessagesByKeys: vi.fn(),
  getMessage: vi.fn(),
  updateMessage: vi.fn(),
}));

vi.mock('src/server/records', () => records);

const { markRead, openRecordChat, removeMessage, sendMessage } =
  await import('src/server/messenger-service');

const membership = {
  id: 'p1',
  memberKey: 'c1:m1',
  conversationId: 'c1',
  workspaceMemberId: 'm1',
  memberRole: 'MEMBER',
  lastReadSeq: 3,
  mutedUntil: null,
};

const storedMessage = (seq: number) => ({
  id: `x${seq}`,
  conversationId: 'c1',
  seq,
  seqKey: `c1:${seq}`,
  kind: 'TEXT',
  authorId: 'm1',
  body: null,
  text: 'Привет',
  clientMessageId: 'k1',
  clientKey: 'c1:k1',
  editedAt: null,
  removedAt: null,
  createdAt: '2026-10-19T10:00:00.000Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  records.findMembersOf.mockResolvedValue([membership]);
  records.findMessagesByKeys.mockResolvedValue([]);
});

describe('sendMessage', () => {
  it('does not let a non-member write', async () => {
    records.findMembership.mockResolvedValue(undefined);

    await expect(
      sendMessage({
        conversationId: 'c1',
        viewerId: 'm9',
        clientMessageId: 'k1',
        text: 'Привет',
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(records.createMessage).not.toHaveBeenCalled();
  });

  it('numbers the message, moves the counter and reads it for the author', async () => {
    records.findMembership.mockResolvedValue(membership);
    records.findMessageByKey.mockResolvedValue(undefined);
    records.findLargestSeq.mockResolvedValueOnce(3).mockResolvedValueOnce(4);
    records.createMessage.mockResolvedValue(storedMessage(4));

    const { message } = await sendMessage({
      conversationId: 'c1',
      viewerId: 'm1',
      clientMessageId: 'k1',
      text: 'Привет',
    });

    expect(message.seq).toBe(4);
    expect(records.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        seq: 4,
        seqKey: 'c1:4',
        clientKey: 'c1:k1',
        authorId: 'm1',
      }),
    );
    expect(records.updateConversation).toHaveBeenCalledWith('c1', {
      lastSeq: 4,
      lastMessageAt: '2026-10-19T10:00:00.000Z',
    });
    expect(records.updateMember).toHaveBeenCalledWith('p1', { lastReadSeq: 4 });
  });

  it('returns the stored message of a repeated send', async () => {
    records.findMembership.mockResolvedValue(membership);
    records.findMessageByKey.mockResolvedValue(storedMessage(4));

    const { message } = await sendMessage({
      conversationId: 'c1',
      viewerId: 'm1',
      clientMessageId: 'k1',
      text: 'Привет',
    });

    expect(message.id).toBe('x4');
    expect(records.createMessage).not.toHaveBeenCalled();
  });
});

describe('removeMessage', () => {
  it('lets only the author remove a message', async () => {
    records.getMessage.mockResolvedValue({
      ...storedMessage(4),
      authorId: 'm2',
    });
    records.findMembership.mockResolvedValue(membership);

    await expect(
      removeMessage({ messageId: 'x4', viewerId: 'm1' }),
    ).rejects.toMatchObject({
      status: 403,
    });
    expect(records.updateMessage).not.toHaveBeenCalled();
  });
});

describe('markRead', () => {
  it('never reads past the last message', async () => {
    records.findMembership.mockResolvedValue(membership);
    records.getConversation.mockResolvedValue({ id: 'c1', lastSeq: 5 });

    await markRead({ conversationId: 'c1', viewerId: 'm1', seq: 99 });

    expect(records.updateMember).toHaveBeenCalledWith('p1', { lastReadSeq: 5 });
  });
});

describe('openRecordChat', () => {
  it('opens the chat only of a task the person can read', async () => {
    records.getReadableRecord.mockResolvedValue(undefined);

    await expect(
      openRecordChat({ viewerId: 'm1', objectName: 'task', recordId: 't1' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(records.createConversation).not.toHaveBeenCalled();
  });

  it('refuses objects without a chat', async () => {
    await expect(
      openRecordChat({ viewerId: 'm1', objectName: 'company', recordId: 'c1' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('joins the person to the task chat', async () => {
    const taskConversation = {
      id: 'c7',
      kind: 'RECORD',
      name: 'Договор',
      recordKey: 'task:t1',
      lastSeq: 2,
      createdAt: '2026-10-19T10:00:00.000Z',
    };

    records.getReadableRecord.mockResolvedValue({ id: 't1', title: 'Договор' });
    records.findConversationByRecordKey.mockResolvedValue(taskConversation);
    records.createMember.mockResolvedValue({ record: membership, isNew: true });

    await openRecordChat({
      viewerId: 'm1',
      objectName: 'task',
      recordId: 't1',
    });

    expect(records.createMember).toHaveBeenCalledWith(
      expect.objectContaining({ memberKey: 'c7:m1', lastReadSeq: 2 }),
    );
  });
});

describe('parseMessengerApiRequest', () => {
  it('accepts a known action with its parameters', () => {
    expect(
      parseMessengerApiRequest({
        action: 'sendMessage',
        conversationId: 'c1',
        clientMessageId: 'k1',
        text: 'Привет',
      }),
    ).toEqual({
      action: 'sendMessage',
      conversationId: 'c1',
      clientMessageId: 'k1',
      text: 'Привет',
    });
  });

  it('refuses unknown actions and wrong parameters', () => {
    expect(parseMessengerApiRequest({ action: 'dropTables' })).toBeUndefined();
    expect(
      parseMessengerApiRequest({
        action: 'markRead',
        conversationId: 'c1',
        seq: '5',
      }),
    ).toBeUndefined();
    expect(
      parseMessengerApiRequest({
        action: 'createGroup',
        name: 'x',
        workspaceMemberIds: [1],
      }),
    ).toBeUndefined();
  });
});

describe('getTaskChatMemberIds', () => {
  it('takes the author and the assignee once', () => {
    expect(
      getTaskChatMemberIds({
        id: 't1',
        assigneeId: 'm1',
        createdBy: { workspaceMemberId: 'm1' },
      }),
    ).toEqual(['m1']);
    expect(
      getTaskChatMemberIds({
        id: 't1',
        assigneeId: 'm2',
        createdBy: { workspaceMemberId: 'm1' },
      }),
    ).toEqual(['m1', 'm2']);
  });
});
