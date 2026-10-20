import { useCallback, useEffect, useState } from 'react';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';

import { callMessenger, getErrorMessage } from 'src/front/api';
import { createClientMessageId } from 'src/front/create-client-message-id';
import { usePolling } from 'src/front/hooks/use-polling';
import { Message } from 'src/front/ui/components';
import {
  type MessagePageResponse,
  type MessageResponse,
} from 'src/shared/api/messenger-api.type';
import {
  type ConversationView,
  type MessageView,
} from 'src/shared/conversation.type';
import { MESSAGES_POLL_INTERVAL_MS } from 'src/shared/messenger.constants';

const mergeMessages = (current: MessageView[], incoming: MessageView[]) => {
  const byId = new Map(current.map((message) => [message.id, message]));

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return [...byId.values()].sort((first, second) => first.seq - second.seq);
};

const formatTime = (value: string) =>
  new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

type ConversationPanelProps = {
  conversation: ConversationView;
  viewerId: string | undefined;
  title: string;
  getMemberName: (workspaceMemberId: string) => string;
  onBack?: () => void;
  onChanged?: () => void;
};

export const ConversationPanel = ({
  conversation,
  viewerId,
  title,
  getMemberName,
  onBack,
  onChanged,
}: ConversationPanelProps) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const conversationId = conversation.id;

  // Опрос перечитывает последнюю страницу: так приходят и новые сообщения, и
  // правки с удалениями недавних.
  const loadLatest = useCallback(async () => {
    try {
      const page = await callMessenger<MessagePageResponse>({
        action: 'listMessages',
        conversationId,
      });

      setMessages((current) => mergeMessages(current, page.messages));
      setHasMore((current) => current || page.hasMore);
      setError(undefined);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить сообщения'));
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    setIsLoading(true);
    setDraft('');
    setEditingMessageId(undefined);
    void loadLatest();
  }, [loadLatest]);

  usePolling(() => void loadLatest(), MESSAGES_POLL_INTERVAL_MS);

  const lastSeq = messages[messages.length - 1]?.seq ?? 0;

  useEffect(() => {
    if (lastSeq > conversation.lastReadSeq) {
      void callMessenger({
        action: 'markRead',
        conversationId,
        seq: lastSeq,
      }).then(
        () => onChanged?.(),
        () => undefined,
      );
    }
  }, [conversationId, lastSeq, conversation.lastReadSeq, onChanged]);

  const loadOlder = async () => {
    const firstSeq = messages[0]?.seq;

    if (firstSeq === undefined) {
      return;
    }

    try {
      const page = await callMessenger<MessagePageResponse>({
        action: 'listMessages',
        conversationId,
        beforeSeq: firstSeq,
      });

      setMessages((current) => mergeMessages(current, page.messages));
      setHasMore(page.hasMore);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить сообщения'));
    }
  };

  const submit = async () => {
    if (draft.trim().length === 0 || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const { message } =
        editingMessageId === undefined
          ? await callMessenger<MessageResponse>({
              action: 'sendMessage',
              conversationId,
              clientMessageId: createClientMessageId(),
              text: draft,
            })
          : await callMessenger<MessageResponse>({
              action: 'editMessage',
              messageId: editingMessageId,
              text: draft,
            });

      setMessages((current) => mergeMessages(current, [message]));
      setDraft('');
      setEditingMessageId(undefined);
      setError(undefined);
      onChanged?.();
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Сообщение не отправлено'));
    } finally {
      setIsSending(false);
    }
  };

  const remove = async (messageId: string) => {
    try {
      const { message } = await callMessenger<MessageResponse>({
        action: 'removeMessage',
        messageId,
      });

      setMessages((current) => mergeMessages(current, [message]));
      onChanged?.();
    } catch (removeError) {
      setError(getErrorMessage(removeError, 'Сообщение не удалено'));
    }
  };

  return (
    <section className="nd-messenger-conversation" aria-label={title}>
      <header
        style={{
          alignItems: 'center',
          borderBottom: `1px solid ${theme.border.color.light}`,
          display: 'flex',
          gap: theme.spacing[2],
          padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
        }}
      >
        {onBack !== undefined && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            Назад
          </Button>
        )}
        <strong className="nd-messenger-ellipsis" style={{ flex: 1 }}>
          {title}
        </strong>
        <span
          style={{
            color: theme.font.color.tertiary,
            fontSize: theme.font.size.sm,
          }}
        >
          {conversation.memberIds.length} уч.
        </span>
      </header>
      <div className="nd-messenger-feed" role="log" aria-live="polite">
        {hasMore && (
          <Button variant="ghost" size="sm" onClick={() => void loadOlder()}>
            Показать раньше
          </Button>
        )}
        {isLoading && <Message>Загрузка…</Message>}
        {!isLoading && messages.length === 0 && (
          <Message>Сообщений пока нет.</Message>
        )}
        {messages.map((message) => {
          const isOwn = message.authorId === viewerId;

          return (
            <div
              key={message.id}
              style={{
                alignItems: isOwn ? 'flex-end' : 'flex-start',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span
                style={{
                  color: theme.font.color.tertiary,
                  fontSize: theme.font.size.xs,
                }}
              >
                {isOwn || message.authorId === null
                  ? ''
                  : `${getMemberName(message.authorId)} · `}
                {formatTime(message.createdAt)}
                {message.editedAt !== null && !message.isRemoved
                  ? ' · изменено'
                  : ''}
              </span>
              <div
                className="nd-messenger-bubble"
                style={{
                  background: isOwn
                    ? theme.background.transparent.blue
                    : theme.background.transparent.lighter,
                  color: message.isRemoved
                    ? theme.font.color.tertiary
                    : undefined,
                  fontStyle: message.isRemoved ? 'italic' : undefined,
                }}
              >
                {message.isRemoved ? 'Сообщение удалено' : message.text}
              </div>
              {isOwn && !message.isRemoved && message.kind === 'TEXT' && (
                <span style={{ display: 'flex', gap: theme.spacing[1] }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingMessageId(message.id);
                      setDraft(message.text);
                    }}
                  >
                    Изменить
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void remove(message.id)}
                  >
                    Удалить
                  </Button>
                </span>
              )}
            </div>
          );
        })}
      </div>
      {error !== undefined && <Message tone="danger">{error}</Message>}
      <div
        className="nd-messenger-composer"
        style={{ borderTop: `1px solid ${theme.border.color.light}` }}
      >
        <textarea
          aria-label="Сообщение"
          placeholder={
            editingMessageId === undefined
              ? 'Сообщение'
              : 'Новый текст сообщения'
          }
          value={draft}
          rows={1}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }

            if (event.key === 'Escape' && editingMessageId !== undefined) {
              setEditingMessageId(undefined);
              setDraft('');
            }
          }}
          style={{
            background: theme.background.transparent.lighter,
            border: `1px solid ${theme.border.color.medium}`,
            borderRadius: theme.border.radius.sm,
            color: theme.font.color.primary,
            padding: theme.spacing[2],
          }}
        />
        <Button
          variant="solid"
          size="sm"
          disabled={isSending || draft.trim().length === 0}
          onClick={() => void submit()}
        >
          {editingMessageId === undefined ? 'Отправить' : 'Сохранить'}
        </Button>
      </div>
    </section>
  );
};
