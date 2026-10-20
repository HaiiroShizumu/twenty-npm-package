import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';
import { useTheme } from 'twenty-ui/theme';

import { DocflowRoot, Message } from 'src/front/ui/components';
import { TaskWorkPanel } from 'src/front/ui/task-work-panel';
import { TASK_FORM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// The same task panel as on the docflow page, on the task's own record page:
// one task, wherever it is opened.
const TaskForm = () => {
  const theme = useTheme();
  const [taskId] = useSelectedRecordIds();

  return (
    <DocflowRoot>
      <div style={{ padding: theme.spacing[3] }}>
        {taskId === undefined ? <Message>Откройте задачу.</Message> : <TaskWorkPanel taskId={taskId} />}
      </div>
    </DocflowRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: TASK_FORM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'docflow-task-form',
  description: 'Инструкция, поля задания и выполнение в карточке задачи',
  component: TaskForm,
});
