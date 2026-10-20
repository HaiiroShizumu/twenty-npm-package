// Те же пределы, что у сервера форка (smb-conversations/constants), чтобы
// беседа вела себя одинаково при любом движке.
export const MESSAGE_MAX_TEXT_LENGTH = 10_000;
export const CONVERSATION_NAME_MAX_LENGTH = 120;
export const GROUP_MAX_MEMBERS = 500;
export const MESSAGES_PAGE_SIZE = 50;
export const MESSAGES_MAX_PAGE_SIZE = 100;
export const SEQ_INSERT_MAX_ATTEMPTS = 5;
// REST Twenty отдаёт не больше 200 записей за запрос.
export const REST_MAX_RECORDS = 200;

export const CONVERSATION_OBJECT_PLURAL = 'smbConversations';
export const MEMBER_OBJECT_PLURAL = 'smbConversationMembers';
export const MESSAGE_OBJECT_PLURAL = 'smbConversationMessages';

// Чат записи открывается только у объектов, где понятно, кто может читать
// запись: проверка идёт запросом к записи от имени человека.
export const RECORD_CHAT_OBJECT_PLURALS: Record<string, string> = {
  task: 'tasks',
};

export const RECORD_CHAT_LABEL_FIELDS: Record<string, string> = {
  task: 'title',
};

export const MESSENGER_API_PATH = '/messenger/api';

export const CONVERSATIONS_POLL_INTERVAL_MS = 5_000;
export const MESSAGES_POLL_INTERVAL_MS = 3_000;
