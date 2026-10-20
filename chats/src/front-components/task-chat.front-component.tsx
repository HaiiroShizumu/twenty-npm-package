import { defineFrontComponent } from 'twenty-sdk/define';
import {
  getApplicationVariable,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import {
  ForkEngineNotice,
  Message,
  MessengerRoot,
} from 'src/front/ui/components';
import { TaskChatView } from 'src/front/ui/task-chat-view';
import { isAppEngine } from 'src/shared/engine';
import { TASK_CHAT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const TaskChat = () => {
  const [taskId] = useSelectedRecordIds();

  return (
    <MessengerRoot>
      {!isAppEngine(getApplicationVariable('MESSENGER_ENGINE')) ? (
        <ForkEngineNotice />
      ) : taskId === undefined ? (
        <Message>Откройте задачу.</Message>
      ) : (
        <TaskChatView taskId={taskId} />
      )}
    </MessengerRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: TASK_CHAT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'messenger-task-chat',
  description: 'Чат задачи в её карточке',
  component: TaskChat,
});
