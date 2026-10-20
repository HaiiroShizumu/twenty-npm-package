import { type MessengerApiRequest } from 'src/shared/api/messenger-api.type';
import { MessengerError } from 'src/server/messenger-error';
import {
  addMembers,
  createGroup,
  editMessage,
  getConversationForViewer,
  listConversations,
  listMessages,
  markRead,
  openDirect,
  openRecordChat,
  removeMessage,
  sendMessage,
} from 'src/server/messenger-service';

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isOptionalNumber = (value: unknown): value is number | undefined =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

// Тело запроса приходит от страницы, но проверяется как чужое.
export const parseMessengerApiRequest = (
  body: Record<string, unknown>,
): MessengerApiRequest | undefined => {
  switch (body.action) {
    case 'listConversations':
      return { action: 'listConversations' };
    case 'getConversation':
      return isString(body.conversationId)
        ? { action: 'getConversation', conversationId: body.conversationId }
        : undefined;
    case 'listMessages':
      return isString(body.conversationId) &&
        isOptionalNumber(body.beforeSeq) &&
        isOptionalNumber(body.afterSeq)
        ? {
            action: 'listMessages',
            conversationId: body.conversationId,
            beforeSeq: body.beforeSeq,
            afterSeq: body.afterSeq,
          }
        : undefined;
    case 'sendMessage':
      return isString(body.conversationId) &&
        isString(body.clientMessageId) &&
        typeof body.text === 'string'
        ? {
            action: 'sendMessage',
            conversationId: body.conversationId,
            clientMessageId: body.clientMessageId,
            text: body.text,
          }
        : undefined;
    case 'editMessage':
      return isString(body.messageId) && typeof body.text === 'string'
        ? { action: 'editMessage', messageId: body.messageId, text: body.text }
        : undefined;
    case 'removeMessage':
      return isString(body.messageId)
        ? { action: 'removeMessage', messageId: body.messageId }
        : undefined;
    case 'markRead':
      return isString(body.conversationId) && typeof body.seq === 'number'
        ? {
            action: 'markRead',
            conversationId: body.conversationId,
            seq: body.seq,
          }
        : undefined;
    case 'openDirect':
      return isString(body.workspaceMemberId)
        ? { action: 'openDirect', workspaceMemberId: body.workspaceMemberId }
        : undefined;
    case 'createGroup':
      return typeof body.name === 'string' &&
        isStringArray(body.workspaceMemberIds)
        ? {
            action: 'createGroup',
            name: body.name,
            workspaceMemberIds: body.workspaceMemberIds,
          }
        : undefined;
    case 'addMembers':
      return isString(body.conversationId) &&
        isStringArray(body.workspaceMemberIds)
        ? {
            action: 'addMembers',
            conversationId: body.conversationId,
            workspaceMemberIds: body.workspaceMemberIds,
          }
        : undefined;
    case 'openRecordChat':
      return isString(body.objectName) && isString(body.recordId)
        ? {
            action: 'openRecordChat',
            objectName: body.objectName,
            recordId: body.recordId,
          }
        : undefined;
    default:
      return undefined;
  }
};

export const runMessengerApiRequest = (
  request: MessengerApiRequest,
  viewerId: string,
) => {
  switch (request.action) {
    case 'listConversations':
      return listConversations(viewerId);
    case 'getConversation':
      return getConversationForViewer(request.conversationId, viewerId);
    case 'listMessages':
      return listMessages({ ...request, viewerId });
    case 'sendMessage':
      return sendMessage({ ...request, viewerId });
    case 'editMessage':
      return editMessage({ ...request, viewerId });
    case 'removeMessage':
      return removeMessage({ ...request, viewerId });
    case 'markRead':
      return markRead({ ...request, viewerId });
    case 'openDirect':
      return openDirect({ ...request, viewerId });
    case 'createGroup':
      return createGroup({ ...request, viewerId });
    case 'addMembers':
      return addMembers({ ...request, viewerId });
    case 'openRecordChat':
      return openRecordChat({ ...request, viewerId });
  }
};

export { MessengerError };
