import { useCallback } from 'react';

import { callMessenger, getErrorMessage } from 'src/front/api';
import { useAsync } from 'src/front/hooks/use-async';
import { useWorkspaceMembers } from 'src/front/hooks/use-workspace-members';
import { Message } from 'src/front/ui/components';
import { ConversationPanel } from 'src/front/ui/conversation-panel';
import { type ConversationResponse } from 'src/shared/api/messenger-api.type';
import { getConversationTitle } from 'src/shared/conversation-view';

// Чат задачи: кто может прочитать задачу, тот входит в её беседу.
export const TaskChatView = ({ taskId }: { taskId: string }) => {
  const { currentMember, getMemberName } = useWorkspaceMembers();
  const { data, error, loading, reload } = useAsync(
    () =>
      callMessenger<ConversationResponse>({
        action: 'openRecordChat',
        objectName: 'task',
        recordId: taskId,
      }),
    [taskId],
  );
  const handleChanged = useCallback(() => void reload(), [reload]);

  if (error !== undefined) {
    return (
      <Message tone="danger">
        {getErrorMessage(error, 'Чат задачи не открылся')}
      </Message>
    );
  }

  if (loading && data === undefined) {
    return <Message>Загрузка…</Message>;
  }

  if (data === undefined) {
    return null;
  }

  return (
    <ConversationPanel
      conversation={data.conversation}
      viewerId={currentMember?.id}
      title={getConversationTitle({
        conversation: data.conversation,
        viewerWorkspaceMemberId: currentMember?.id,
        getMemberName,
      })}
      getMemberName={getMemberName}
      onChanged={handleChanged}
    />
  );
};
