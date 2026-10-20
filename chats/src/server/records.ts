import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';

import {
  restAnd,
  restEq,
  restIn,
  restNumberGt,
  restNumberLt,
} from 'src/shared/api/rest-filter.util';
import {
  readRestList,
  readRestRecord,
} from 'src/shared/api/rest-response.util';
import {
  type ConversationRecord,
  type MemberRecord,
  type MessageRecord,
} from 'src/shared/conversation.type';
import {
  CONVERSATION_OBJECT_PLURAL,
  MEMBER_OBJECT_PLURAL,
  MESSAGE_OBJECT_PLURAL,
  REST_MAX_RECORDS,
} from 'src/shared/messenger.constants';

// Записи бесед закрыты от людей (readability APPLICATION), поэтому функции
// ходят в них от имени приложения и сами проверяют участие. От имени человека
// читается только запись, чат которой он открывает.
const application = new RestApiClient({ runAs: 'application' });
const person = new RestApiClient();

const list = async <TRecord>(
  namePlural: string,
  query: Record<string, string | number | undefined>,
) =>
  readRestList<TRecord>(await application.get(`/rest/${namePlural}`, { query }))
    .records;

const findOne = async <TRecord>(namePlural: string, filter: string) =>
  (await list<TRecord>(namePlural, { filter, limit: 1 }))[0];

const create = async <TRecord>(
  namePlural: string,
  data: Record<string, unknown>,
) =>
  readRestRecord<TRecord>(await application.post(`/rest/${namePlural}`, data));

const update = async <TRecord>(
  namePlural: string,
  id: string,
  data: Record<string, unknown>,
) =>
  readRestRecord<TRecord>(
    await application.patch(`/rest/${namePlural}/${id}`, data),
  );

// Вставка, упёршаяся в уникальный ключ, — не ошибка: вызывающий перечитывает
// запись по этому ключу. Остальные ошибки идут дальше.
export const createUnlessTaken = async <TRecord>(
  namePlural: string,
  data: Record<string, unknown>,
  findTaken: () => Promise<TRecord | undefined>,
): Promise<{ record: TRecord; isNew: boolean }> => {
  try {
    const record = await create<TRecord>(namePlural, data);

    if (record !== undefined) {
      return { record, isNew: true };
    }
  } catch (error) {
    if (!(error instanceof RestApiClientError)) {
      throw error;
    }

    const taken = await findTaken();

    if (taken !== undefined) {
      return { record: taken, isNew: false };
    }

    throw error;
  }

  throw new Error(`REST не вернул созданную запись ${namePlural}`);
};

export const getConversation = (conversationId: string) =>
  findOne<ConversationRecord>(
    CONVERSATION_OBJECT_PLURAL,
    restEq('id', conversationId),
  );

export const findConversationsByIds = async (conversationIds: string[]) =>
  conversationIds.length === 0
    ? []
    : list<ConversationRecord>(CONVERSATION_OBJECT_PLURAL, {
        filter: restIn('id', conversationIds),
        limit: REST_MAX_RECORDS,
      });

export const findConversationByDirectKey = (directKey: string) =>
  findOne<ConversationRecord>(
    CONVERSATION_OBJECT_PLURAL,
    restEq('directKey', directKey),
  );

export const findConversationByRecordKey = (recordKey: string) =>
  findOne<ConversationRecord>(
    CONVERSATION_OBJECT_PLURAL,
    restEq('recordKey', recordKey),
  );

export const createConversation = (
  data: Partial<ConversationRecord>,
  findTaken: () => Promise<ConversationRecord | undefined>,
) =>
  createUnlessTaken<ConversationRecord>(
    CONVERSATION_OBJECT_PLURAL,
    data,
    findTaken,
  );

export const updateConversation = (
  conversationId: string,
  data: Partial<ConversationRecord>,
) =>
  update<ConversationRecord>(CONVERSATION_OBJECT_PLURAL, conversationId, data);

export const findMembershipsOf = (workspaceMemberId: string) =>
  list<MemberRecord>(MEMBER_OBJECT_PLURAL, {
    filter: restEq('workspaceMemberId', workspaceMemberId),
    limit: REST_MAX_RECORDS,
  });

export const findMembership = (memberKey: string) =>
  findOne<MemberRecord>(MEMBER_OBJECT_PLURAL, restEq('memberKey', memberKey));

export const findMembersOf = async (conversationIds: string[]) =>
  conversationIds.length === 0
    ? []
    : list<MemberRecord>(MEMBER_OBJECT_PLURAL, {
        filter: restIn('conversationId', conversationIds),
        limit: REST_MAX_RECORDS,
      });

export const createMember = (data: Partial<MemberRecord>) =>
  createUnlessTaken<MemberRecord>(MEMBER_OBJECT_PLURAL, data, () =>
    findMembership(data.memberKey ?? ''),
  );

export const updateMember = (memberId: string, data: Partial<MemberRecord>) =>
  update<MemberRecord>(MEMBER_OBJECT_PLURAL, memberId, data);

export const getMessage = (messageId: string) =>
  findOne<MessageRecord>(MESSAGE_OBJECT_PLURAL, restEq('id', messageId));

export const findMessageByKey = (field: 'seqKey' | 'clientKey', key: string) =>
  findOne<MessageRecord>(MESSAGE_OBJECT_PLURAL, restEq(field, key));

export const findMessagesByKeys = async (seqKeys: string[]) =>
  seqKeys.length === 0
    ? []
    : list<MessageRecord>(MESSAGE_OBJECT_PLURAL, {
        filter: restIn('seqKey', seqKeys),
        limit: REST_MAX_RECORDS,
      });

export const findLargestSeq = async (conversationId: string) =>
  Number(
    (
      await list<MessageRecord>(MESSAGE_OBJECT_PLURAL, {
        filter: restEq('conversationId', conversationId),
        order_by: 'seq[DescNullsLast]',
        limit: 1,
      })
    )[0]?.seq ?? 0,
  );

export const findMessagePage = ({
  conversationId,
  beforeSeq,
  afterSeq,
  limit,
}: {
  conversationId: string;
  beforeSeq?: number;
  afterSeq?: number;
  limit: number;
}) =>
  list<MessageRecord>(MESSAGE_OBJECT_PLURAL, {
    filter: restAnd(
      restEq('conversationId', conversationId),
      afterSeq !== undefined ? restNumberGt('seq', afterSeq) : undefined,
      beforeSeq !== undefined ? restNumberLt('seq', beforeSeq) : undefined,
    ),
    order_by:
      afterSeq !== undefined ? 'seq[AscNullsLast]' : 'seq[DescNullsLast]',
    limit,
  });

export const createMessage = async (data: Partial<MessageRecord>) =>
  create<MessageRecord>(MESSAGE_OBJECT_PLURAL, data);

export const updateMessage = (
  messageId: string,
  data: Partial<MessageRecord>,
) => update<MessageRecord>(MESSAGE_OBJECT_PLURAL, messageId, data);

export const findExistingWorkspaceMemberIds = async (
  workspaceMemberIds: string[],
) =>
  workspaceMemberIds.length === 0
    ? []
    : (
        await list<{ id: string }>('workspaceMembers', {
          filter: restIn('id', workspaceMemberIds),
          limit: REST_MAX_RECORDS,
        })
      ).map((workspaceMember) => workspaceMember.id);

// Чат записи открывает тот, кто может её прочитать: запрос идёт от его имени,
// чужая и несуществующая запись дают один ответ.
export const getReadableRecord = async (
  namePlural: string,
  recordId: string,
): Promise<Record<string, unknown> | undefined> => {
  try {
    return readRestRecord<Record<string, unknown>>(
      await person.get(`/rest/${namePlural}/${recordId}`),
    );
  } catch (error) {
    if (error instanceof RestApiClientError) {
      return undefined;
    }

    throw error;
  }
};
