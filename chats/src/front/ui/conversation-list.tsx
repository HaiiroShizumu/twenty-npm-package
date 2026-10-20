import { useTheme } from 'twenty-ui/theme';

import { Message } from 'src/front/ui/components';
import { type ConversationView } from 'src/shared/conversation.type';

type ConversationListProps = {
  conversations: ConversationView[];
  selectedConversationId: string | undefined;
  getTitle: (conversation: ConversationView) => string;
  getMemberName: (workspaceMemberId: string) => string;
  viewerId: string | undefined;
  onSelect: (conversationId: string) => void;
};

export const ConversationList = ({
  conversations,
  selectedConversationId,
  getTitle,
  getMemberName,
  viewerId,
  onSelect,
}: ConversationListProps) => {
  const theme = useTheme();

  if (conversations.length === 0) {
    return <Message>Бесед пока нет: начните новую.</Message>;
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {conversations.map((conversation) => {
        const lastMessage = conversation.lastMessage;
        const preview =
          lastMessage === null
            ? 'Нет сообщений'
            : `${
                lastMessage.authorId === viewerId
                  ? 'Вы: '
                  : conversation.kind !== 'DIRECT' &&
                      lastMessage.authorId !== null
                    ? `${getMemberName(lastMessage.authorId)}: `
                    : ''
              }${lastMessage.isRemoved ? 'сообщение удалено' : lastMessage.text}`;

        return (
          <li key={conversation.id}>
            <button
              type="button"
              className="nd-messenger-item"
              aria-current={conversation.id === selectedConversationId}
              onClick={() => onSelect(conversation.id)}
              style={{
                background:
                  conversation.id === selectedConversationId
                    ? theme.background.transparent.light
                    : 'transparent',
                borderBottom: `1px solid ${theme.border.color.light}`,
              }}
            >
              <span
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  gap: theme.spacing[2],
                }}
              >
                <strong className="nd-messenger-ellipsis" style={{ flex: 1 }}>
                  {getTitle(conversation)}
                </strong>
                {conversation.unreadCount > 0 && (
                  <span
                    aria-label={`Непрочитано: ${conversation.unreadCount}`}
                    style={{
                      background: theme.color.blue,
                      borderRadius: theme.border.radius.pill,
                      color: theme.font.color.inverted,
                      fontSize: theme.font.size.xs,
                      padding: `0 ${theme.spacing[1]}`,
                    }}
                  >
                    {conversation.unreadCount}
                  </span>
                )}
              </span>
              <span
                className="nd-messenger-ellipsis"
                style={{
                  color: theme.font.color.tertiary,
                  fontSize: theme.font.size.sm,
                }}
              >
                {preview}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
