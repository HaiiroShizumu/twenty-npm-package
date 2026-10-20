import { useCallback, useState } from 'react';
import { Button } from 'src/front/ui/button';
import { useTheme } from 'twenty-ui/theme';

import { callMessenger, getErrorMessage } from 'src/front/api';
import { useAsync } from 'src/front/hooks/use-async';
import { usePolling } from 'src/front/hooks/use-polling';
import { useWorkspaceMembers } from 'src/front/hooks/use-workspace-members';
import { Message } from 'src/front/ui/components';
import { ConversationList } from 'src/front/ui/conversation-list';
import { ConversationPanel } from 'src/front/ui/conversation-panel';
import { NewConversationForm } from 'src/front/ui/new-conversation-form';
import { type ConversationListResponse } from 'src/shared/api/messenger-api.type';
import { type ConversationView } from 'src/shared/conversation.type';
import { getConversationTitle } from 'src/shared/conversation-view';
import { CONVERSATIONS_POLL_INTERVAL_MS } from 'src/shared/messenger.constants';

export const MessengerView = () => {
  const theme = useTheme();
  const { members, currentMember, getMemberName } = useWorkspaceMembers();
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const { data, error, loading, reload } = useAsync(
    () =>
      callMessenger<ConversationListResponse>({ action: 'listConversations' }),
    [],
  );

  usePolling(() => void reload(), CONVERSATIONS_POLL_INTERVAL_MS);

  const conversations = data?.conversations ?? [];
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const getTitle = useCallback(
    (conversation: ConversationView) =>
      getConversationTitle({
        conversation,
        viewerWorkspaceMemberId: currentMember?.id,
        getMemberName,
      }),
    [currentMember?.id, getMemberName],
  );
  const handleChanged = useCallback(() => void reload(), [reload]);

  return (
    <div
      className="nd-messenger-split"
      data-open={
        selectedConversation !== undefined || isCreating ? 'true' : 'false'
      }
    >
      <nav
        className="nd-messenger-list"
        aria-label="Беседы"
        style={{ borderRight: `1px solid ${theme.border.color.light}` }}
      >
        <div style={{ padding: `${theme.spacing[2]} ${theme.spacing[4]}` }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsCreating(true);
              setSelectedConversationId(undefined);
            }}
          >
            Новая беседа
          </Button>
        </div>
        {loading && data === undefined && <Message>Загрузка…</Message>}
        {error !== undefined && (
          <Message tone="danger">
            {getErrorMessage(error, 'Беседы не загрузились')}
          </Message>
        )}
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          getTitle={getTitle}
          getMemberName={getMemberName}
          viewerId={currentMember?.id}
          onSelect={(conversationId) => {
            setIsCreating(false);
            setSelectedConversationId(conversationId);
          }}
        />
      </nav>
      {isCreating ? (
        <NewConversationForm
          members={members}
          viewerId={currentMember?.id}
          onCancel={() => setIsCreating(false)}
          onCreated={(conversation) => {
            setIsCreating(false);
            setSelectedConversationId(conversation.id);
            void reload();
          }}
        />
      ) : selectedConversation !== undefined ? (
        <ConversationPanel
          conversation={selectedConversation}
          viewerId={currentMember?.id}
          title={getTitle(selectedConversation)}
          getMemberName={getMemberName}
          onBack={() => setSelectedConversationId(undefined)}
          onChanged={handleChanged}
        />
      ) : (
        <div className="nd-messenger-conversation">
          <Message>Выберите беседу слева.</Message>
        </div>
      )}
    </div>
  );
};
