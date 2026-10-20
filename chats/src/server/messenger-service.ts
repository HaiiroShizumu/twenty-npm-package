import { RestApiClientError } from 'twenty-client-sdk/rest';

import {
  type ConversationListResponse,
  type ConversationResponse,
  type MessagePageResponse,
  type MessageResponse,
  type OkResponse,
} from 'src/shared/api/messenger-api.type';
import {
  type ConversationRecord,
  type MemberRecord,
  type MemberRole,
  type MessageRecord,
} from 'src/shared/conversation.type';
import {
  sortConversations,
  toConversationView,
  toMessageView,
} from 'src/shared/conversation-view';
import {
  buildClientKey,
  buildDirectKey,
  buildMemberKey,
  buildRecordKey,
  buildSeqKey,
} from 'src/shared/keys';
import { buildMessageBody } from 'src/shared/message-body';
import { insertWithNextSeq } from 'src/shared/message-numbering';
import {
  CONVERSATION_NAME_MAX_LENGTH,
  GROUP_MAX_MEMBERS,
  MESSAGES_MAX_PAGE_SIZE,
  MESSAGES_PAGE_SIZE,
  RECORD_CHAT_LABEL_FIELDS,
  RECORD_CHAT_OBJECT_PLURALS,
  SEQ_INSERT_MAX_ATTEMPTS,
} from 'src/shared/messenger.constants';
import { MessengerError, notFound } from 'src/server/messenger-error';
import {
  createConversation,
  createMember,
  createMessage,
  findConversationByDirectKey,
  findConversationByRecordKey,
  findConversationsByIds,
  findExistingWorkspaceMemberIds,
  findLargestSeq,
  findMembersOf,
  findMembership,
  findMembershipsOf,
  findMessageByKey,
  findMessagePage,
  findMessagesByKeys,
  getConversation,
  getMessage,
  getReadableRecord,
  updateConversation,
  updateMember,
  updateMessage,
} from 'src/server/records';

// Все действия — за одного сотрудника (`viewerId`): видит и пишет он только
// в беседах, где состоит. Чужая беседа отвечает как несуществующая, чтобы id
// нельзя было перебрать.
const getMembershipOrThrow = async (
  conversationId: string,
  viewerId: string,
) => {
  const membership = await findMembership(
    buildMemberKey(conversationId, viewerId),
  );

  if (membership === undefined) {
    throw notFound();
  }

  return membership;
};

const buildView = async (
  conversation: ConversationRecord,
  viewerId: string,
) => {
  const [members, lastMessages] = await Promise.all([
    findMembersOf([conversation.id]),
    Number(conversation.lastSeq ?? 0) > 0
      ? findMessagesByKeys([
          buildSeqKey(conversation.id, Number(conversation.lastSeq)),
        ])
      : Promise.resolve([]),
  ]);

  return toConversationView({
    conversation,
    members,
    viewerWorkspaceMemberId: viewerId,
    lastMessage: lastMessages[0],
  });
};

export const listConversations = async (
  viewerId: string,
): Promise<ConversationListResponse> => {
  const memberships = await findMembershipsOf(viewerId);
  const conversationIds = memberships.map(
    (membership) => membership.conversationId,
  );
  const [conversations, members] = await Promise.all([
    findConversationsByIds(conversationIds),
    findMembersOf(conversationIds),
  ]);
  const lastMessages = await findMessagesByKeys(
    conversations
      .filter((conversation) => Number(conversation.lastSeq ?? 0) > 0)
      .map((conversation) =>
        buildSeqKey(conversation.id, Number(conversation.lastSeq)),
      ),
  );

  return {
    conversations: sortConversations(
      conversations.map((conversation) =>
        toConversationView({
          conversation,
          members: members.filter(
            (member) => member.conversationId === conversation.id,
          ),
          viewerWorkspaceMemberId: viewerId,
          lastMessage: lastMessages.find(
            (message) => message.conversationId === conversation.id,
          ),
        }),
      ),
    ),
  };
};

export const getConversationForViewer = async (
  conversationId: string,
  viewerId: string,
): Promise<ConversationResponse> => {
  await getMembershipOrThrow(conversationId, viewerId);

  const conversation = await getConversation(conversationId);

  if (conversation === undefined) {
    throw notFound();
  }

  return { conversation: await buildView(conversation, viewerId) };
};

export const listMessages = async ({
  conversationId,
  viewerId,
  beforeSeq,
  afterSeq,
}: {
  conversationId: string;
  viewerId: string;
  beforeSeq?: number;
  afterSeq?: number;
}): Promise<MessagePageResponse> => {
  await getMembershipOrThrow(conversationId, viewerId);

  const limit = Math.min(MESSAGES_PAGE_SIZE, MESSAGES_MAX_PAGE_SIZE);
  const page = await findMessagePage({
    conversationId,
    beforeSeq,
    afterSeq,
    limit: limit + 1,
  });
  const messages = page.slice(0, limit).map(toMessageView);

  return {
    messages: afterSeq !== undefined ? messages : messages.reverse(),
    hasMore: page.length > limit,
  };
};

// Счётчик беседы только растёт: после записи сверяемся с наибольшим номером,
// чтобы параллельная отправка с меньшим номером его не откатила.
const advanceConversationSeq = async (
  conversationId: string,
  seq: number,
  lastMessageAt: string,
) => {
  await updateConversation(conversationId, { lastSeq: seq, lastMessageAt });

  const largestSeq = await findLargestSeq(conversationId);

  if (largestSeq > seq) {
    await updateConversation(conversationId, { lastSeq: largestSeq });
  }
};

const advanceReadSeq = async (membership: MemberRecord, seq: number) => {
  if (Number(membership.lastReadSeq ?? 0) < seq) {
    await updateMember(membership.id, { lastReadSeq: seq });
  }
};

export const sendMessage = async ({
  conversationId,
  viewerId,
  clientMessageId,
  text,
}: {
  conversationId: string;
  viewerId: string;
  clientMessageId: string;
  text: string;
}): Promise<MessageResponse> => {
  const membership = await getMembershipOrThrow(conversationId, viewerId);
  const clientKey = buildClientKey(conversationId, clientMessageId);
  const alreadySent = await findMessageByKey('clientKey', clientKey);

  if (alreadySent !== undefined) {
    return { message: toMessageView(alreadySent) };
  }

  const built = buildMessageBody(text);

  if (built.status === 'EMPTY') {
    throw new MessengerError(400, 'Пустое сообщение');
  }

  if (built.status === 'TOO_LONG') {
    throw new MessengerError(400, 'Сообщение слишком длинное');
  }

  const numbered = await insertWithNextSeq<MessageRecord>(
    {
      findLargestSeq: () => findLargestSeq(conversationId),
      insertWithSeq: async (seq) => {
        try {
          return await createMessage({
            conversationId,
            seq,
            seqKey: buildSeqKey(conversationId, seq),
            kind: 'TEXT',
            authorId: viewerId,
            body: built.body,
            text: built.text,
            clientMessageId,
            clientKey,
          });
        } catch (error) {
          if (
            error instanceof RestApiClientError &&
            ((await findMessageByKey(
              'seqKey',
              buildSeqKey(conversationId, seq),
            )) !== undefined ||
              (await findMessageByKey('clientKey', clientKey)) !== undefined)
          ) {
            return undefined;
          }

          throw error;
        }
      },
      findSameSend: () => findMessageByKey('clientKey', clientKey),
    },
    SEQ_INSERT_MAX_ATTEMPTS,
  );

  if (numbered.status === 'INSERTED') {
    await advanceConversationSeq(
      conversationId,
      numbered.seq,
      numbered.message.createdAt,
    );
    // Автор прочитал собственное сообщение.
    await advanceReadSeq(membership, numbered.seq);
  }

  return { message: toMessageView(numbered.message) };
};

const getOwnMessageOrThrow = async (messageId: string, viewerId: string) => {
  const message = await getMessage(messageId);

  if (message === undefined || message.removedAt !== null) {
    throw new MessengerError(404, 'Сообщение не найдено');
  }

  await getMembershipOrThrow(message.conversationId, viewerId);

  if (message.authorId !== viewerId) {
    throw new MessengerError(403, 'Менять сообщение может только автор');
  }

  return message;
};

export const editMessage = async ({
  messageId,
  viewerId,
  text,
}: {
  messageId: string;
  viewerId: string;
  text: string;
}): Promise<MessageResponse> => {
  const message = await getOwnMessageOrThrow(messageId, viewerId);
  const built = buildMessageBody(text);

  if (built.status !== 'OK') {
    throw new MessengerError(
      400,
      built.status === 'EMPTY'
        ? 'Пустое сообщение'
        : 'Сообщение слишком длинное',
    );
  }

  const updated = await updateMessage(message.id, {
    body: built.body,
    text: built.text,
    editedAt: new Date().toISOString(),
  });

  return { message: toMessageView(updated ?? message) };
};

// Строка остаётся: номера идут подряд, счётчики непрочитанного сходятся.
export const removeMessage = async ({
  messageId,
  viewerId,
}: {
  messageId: string;
  viewerId: string;
}): Promise<MessageResponse> => {
  const message = await getOwnMessageOrThrow(messageId, viewerId);
  const updated = await updateMessage(message.id, {
    body: null,
    text: '',
    removedAt: new Date().toISOString(),
  });

  return { message: toMessageView(updated ?? message) };
};

export const markRead = async ({
  conversationId,
  viewerId,
  seq,
}: {
  conversationId: string;
  viewerId: string;
  seq: number;
}): Promise<OkResponse> => {
  const membership = await getMembershipOrThrow(conversationId, viewerId);
  const conversation = await getConversation(conversationId);

  await advanceReadSeq(
    membership,
    Math.min(Math.trunc(seq), Number(conversation?.lastSeq ?? 0)),
  );

  return { ok: true };
};

const assertWorkspaceMembersExist = async (workspaceMemberIds: string[]) => {
  const existing = new Set(
    await findExistingWorkspaceMemberIds(workspaceMemberIds),
  );

  if (
    workspaceMemberIds.some(
      (workspaceMemberId) => !existing.has(workspaceMemberId),
    )
  ) {
    throw new MessengerError(404, 'Сотрудник не найден');
  }
};

// Повторное добавление — не ошибка и не вторая запись. Новый участник не
// видит старое как непрочитанное.
export const addMembersToConversation = async ({
  conversation,
  members,
}: {
  conversation: ConversationRecord;
  members: { workspaceMemberId: string; role: MemberRole }[];
}): Promise<number> => {
  let addedCount = 0;

  for (const member of members) {
    const { isNew } = await createMember({
      memberKey: buildMemberKey(conversation.id, member.workspaceMemberId),
      conversationId: conversation.id,
      workspaceMemberId: member.workspaceMemberId,
      memberRole: member.role,
      lastReadSeq: Number(conversation.lastSeq ?? 0),
    });

    addedCount += isNew ? 1 : 0;
  }

  return addedCount;
};

export const openDirect = async ({
  viewerId,
  workspaceMemberId,
}: {
  viewerId: string;
  workspaceMemberId: string;
}): Promise<ConversationResponse> => {
  await assertWorkspaceMembersExist([workspaceMemberId]);

  const directKey = buildDirectKey(viewerId, workspaceMemberId);
  const { record: conversation } = await createUnlessFound(
    () => findConversationByDirectKey(directKey),
    () =>
      createConversation(
        { kind: 'DIRECT', name: null, directKey, creatorId: viewerId },
        () => findConversationByDirectKey(directKey),
      ),
  );

  await addMembersToConversation({
    conversation,
    members: [...new Set([viewerId, workspaceMemberId])].map((memberId) => ({
      workspaceMemberId: memberId,
      role: 'MEMBER' as const,
    })),
  });

  return { conversation: await buildView(conversation, viewerId) };
};

const createUnlessFound = async <TRecord>(
  find: () => Promise<TRecord | undefined>,
  create: () => Promise<{ record: TRecord; isNew: boolean }>,
) => {
  const found = await find();

  return found !== undefined ? { record: found, isNew: false } : create();
};

export const createGroup = async ({
  viewerId,
  name,
  workspaceMemberIds,
}: {
  viewerId: string;
  name: string;
  workspaceMemberIds: string[];
}): Promise<ConversationResponse> => {
  const trimmedName = name.trim();
  const otherMemberIds = [...new Set(workspaceMemberIds)].filter(
    (memberId) => memberId !== viewerId,
  );

  if (
    trimmedName.length === 0 ||
    trimmedName.length > CONVERSATION_NAME_MAX_LENGTH
  ) {
    throw new MessengerError(400, 'Название беседы — от 1 до 120 символов');
  }

  if (
    otherMemberIds.length === 0 ||
    otherMemberIds.length + 1 > GROUP_MAX_MEMBERS
  ) {
    throw new MessengerError(400, 'В беседе нужен хотя бы один коллега');
  }

  await assertWorkspaceMembersExist(otherMemberIds);

  const { record: conversation } = await createConversation(
    { kind: 'GROUP', name: trimmedName, creatorId: viewerId },
    () => Promise.resolve(undefined),
  );

  await addMembersToConversation({
    conversation,
    members: [
      { workspaceMemberId: viewerId, role: 'OWNER' },
      ...otherMemberIds.map((memberId) => ({
        workspaceMemberId: memberId,
        role: 'MEMBER' as const,
      })),
    ],
  });

  return { conversation: await buildView(conversation, viewerId) };
};

export const addMembers = async ({
  conversationId,
  viewerId,
  workspaceMemberIds,
}: {
  conversationId: string;
  viewerId: string;
  workspaceMemberIds: string[];
}): Promise<ConversationResponse> => {
  await getMembershipOrThrow(conversationId, viewerId);

  const conversation = await getConversation(conversationId);

  if (conversation === undefined) {
    throw notFound();
  }

  if (conversation.kind !== 'GROUP') {
    throw new MessengerError(
      400,
      'Добавлять участников можно только в групповую беседу',
    );
  }

  const memberIds = [...new Set(workspaceMemberIds)];
  const currentMembers = await findMembersOf([conversationId]);

  if (currentMembers.length + memberIds.length > GROUP_MAX_MEMBERS) {
    throw new MessengerError(400, 'В беседе слишком много участников');
  }

  await assertWorkspaceMembersExist(memberIds);
  await addMembersToConversation({
    conversation,
    members: memberIds.map((memberId) => ({
      workspaceMemberId: memberId,
      role: 'MEMBER',
    })),
  });

  return { conversation: await buildView(conversation, viewerId) };
};

export const findOrCreateRecordConversation = async ({
  objectName,
  recordId,
  recordName,
  creatorId,
}: {
  objectName: string;
  recordId: string;
  recordName: string | null;
  creatorId: string;
}) => {
  const recordKey = buildRecordKey(objectName, recordId);
  const { record } = await createUnlessFound(
    () => findConversationByRecordKey(recordKey),
    () =>
      createConversation(
        {
          kind: 'RECORD',
          name: recordName,
          recordObjectName: objectName,
          recordId,
          recordKey,
          creatorId,
        },
        () => findConversationByRecordKey(recordKey),
      ),
  );

  return record;
};

export const openRecordChat = async ({
  viewerId,
  objectName,
  recordId,
}: {
  viewerId: string;
  objectName: string;
  recordId: string;
}): Promise<ConversationResponse> => {
  const namePlural = RECORD_CHAT_OBJECT_PLURALS[objectName];

  if (namePlural === undefined) {
    throw new MessengerError(400, 'У записей этого объекта нет чата');
  }

  const record = await getReadableRecord(namePlural, recordId);

  if (record === undefined) {
    throw new MessengerError(404, 'Запись не найдена');
  }

  const label = record[RECORD_CHAT_LABEL_FIELDS[objectName] ?? ''];
  const conversation = await findOrCreateRecordConversation({
    objectName,
    recordId,
    recordName: typeof label === 'string' && label.length > 0 ? label : null,
    creatorId: viewerId,
  });

  await addMembersToConversation({
    conversation,
    members: [{ workspaceMemberId: viewerId, role: 'MEMBER' }],
  });

  return { conversation: await buildView(conversation, viewerId) };
};
