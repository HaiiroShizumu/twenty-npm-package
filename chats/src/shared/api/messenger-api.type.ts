import {
  type ConversationView,
  type MessageView,
} from 'src/shared/conversation.type';

// Одна функция-маршрут на все действия: страница и вкладка задачи зовут её с
// `action`, ответ всегда JSON.
export type MessengerApiRequest =
  | { action: 'listConversations' }
  | { action: 'getConversation'; conversationId: string }
  | {
      action: 'listMessages';
      conversationId: string;
      beforeSeq?: number;
      afterSeq?: number;
    }
  | {
      action: 'sendMessage';
      conversationId: string;
      clientMessageId: string;
      text: string;
    }
  | { action: 'editMessage'; messageId: string; text: string }
  | { action: 'removeMessage'; messageId: string }
  | { action: 'markRead'; conversationId: string; seq: number }
  | { action: 'openDirect'; workspaceMemberId: string }
  | { action: 'createGroup'; name: string; workspaceMemberIds: string[] }
  | {
      action: 'addMembers';
      conversationId: string;
      workspaceMemberIds: string[];
    }
  | { action: 'openRecordChat'; objectName: string; recordId: string };

export type MessengerApiAction = MessengerApiRequest['action'];

export type ConversationListResponse = { conversations: ConversationView[] };
export type ConversationResponse = { conversation: ConversationView };
export type MessagePageResponse = { messages: MessageView[]; hasMore: boolean };
export type MessageResponse = { message: MessageView };
export type OkResponse = { ok: true };
