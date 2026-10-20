import { useState } from 'react';
import { enqueueSnackbar } from 'twenty-sdk/front-component';
import { Button } from 'src/front/ui/kit';
import { Tag } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';

import { callAppRoute, getErrorMessage, getRecord } from 'src/front/api';
import { formatDate, formatMemberName, isOverdue, TASK_STATUS_LABELS } from 'src/front/format';
import { useAsync } from 'src/front/hooks/use-async';
import { useWorkspaceMembers } from 'src/front/hooks/use-workspace-members';
import { type DocflowTask } from 'src/front/types';
import { Details, Message, SectionTitle } from 'src/front/ui/components';
import { FormFieldInputs } from 'src/front/ui/form-field-inputs';
import { FormFieldsBuilder } from 'src/front/ui/form-fields-builder';
import { TASK_DONE_STATUS } from 'src/shared/docflow.constants';
import { type FormField, type FormValues } from 'src/shared/form/form-field.type';
import { getFormFieldsError, parseFormFields, parseFormValues } from 'src/shared/form/form-fields.util';

// The one-off fields of a task: the author builds them, the worker fills them.
const TaskFieldsEditor = ({
  initialFields,
  onSave,
  onCancel,
}: {
  initialFields: FormField[];
  onSave: (fields: FormField[]) => Promise<void>;
  onCancel: () => void;
}) => {
  const theme = useTheme();
  const [fields, setFields] = useState(initialFields);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const save = async () => {
    const fieldsError = getFormFieldsError(fields);

    if (fieldsError !== undefined) {
      setErrorMessage(fieldsError);

      return;
    }

    setIsSaving(true);
    setErrorMessage(undefined);
    await onSave(fields).finally(() => setIsSaving(false));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
      <FormFieldsBuilder fields={fields} onChange={setFields} disabled={isSaving} />
      {errorMessage !== undefined && <Message tone="danger">{errorMessage}</Message>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
        <Button variant="solid" size="sm" loading={isSaving} onClick={() => void save()}>
          Сохранить поля
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  );
};

export const TaskWorkPanel = ({
  taskId,
  onChanged,
}: {
  taskId: string;
  onChanged?: () => void;
}) => {
  const theme = useTheme();
  const { members } = useWorkspaceMembers();
  const { data: task, loading, error, reload } = useAsync(
    () => getRecord<DocflowTask>('tasks', taskId),
    [taskId],
  );
  const [draftValues, setDraftValues] = useState<FormValues | undefined>();
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  if (task === undefined) {
    return loading ? (
      <Message>Загрузка…</Message>
    ) : (
      <Message tone="danger">{getErrorMessage(error, 'Задание не найдено или нет доступа.')}</Message>
    );
  }

  const fields = parseFormFields(task.smbFormSchema);
  const values = draftValues ?? parseFormValues(task.smbFormValues);
  const isProcessTask = typeof task.smbWorkflowThreadId === 'string' && task.smbWorkflowThreadId.length > 0;
  const isDone = task.status === TASK_DONE_STATUS;
  const assignee = members.find((member) => member.id === task.assigneeId);

  const runAction = async (action: () => Promise<unknown>, successMessage: string, failureMessage: string) => {
    setIsBusy(true);
    setErrorMessage(undefined);

    try {
      await action();
      await enqueueSnackbar({ message: successMessage, variant: 'success' });
      setDraftValues(undefined);
      await reload();
      onChanged?.();
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError, failureMessage));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
      <strong style={{ fontSize: theme.font.size.lg }}>{task.title?.trim() || 'Без названия'}</strong>
      <Details
        rows={[
          {
            label: 'Статус',
            value: <Tag color={isDone ? 'green' : 'gray'}>{TASK_STATUS_LABELS[task.status ?? ''] ?? task.status ?? 'Без статуса'}</Tag>,
          },
          { label: 'Исполнитель', value: formatMemberName(assignee) },
          {
            label: 'Срок',
            value: task.dueAt && (
              <span style={{ color: isOverdue(task.dueAt, task.status, new Date()) ? theme.font.color.danger : undefined }}>
                {formatDate(task.dueAt)}
              </span>
            ),
          },
          { label: 'Процесс', value: isProcessTask ? 'Задание шага процесса' : undefined },
        ]}
      />
      {typeof task.smbInstruction === 'string' && task.smbInstruction.trim().length > 0 && (
        <section
          aria-label="Инструкция"
          style={{
            background: theme.background.transparent.lighter,
            borderRadius: theme.border.radius.md,
            padding: theme.spacing[3],
            whiteSpace: 'pre-wrap',
          }}
        >
          <div style={{ color: theme.font.color.tertiary, fontSize: theme.font.size.sm, marginBottom: theme.spacing[1] }}>
            Инструкция
          </div>
          {task.smbInstruction}
        </section>
      )}
      <SectionTitle
        action={
          !isProcessTask &&
          !isEditingFields &&
          !isDone && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditingFields(true)}>
              {fields.length > 0 ? 'Изменить поля' : 'Добавить поля'}
            </Button>
          )
        }
      >
        {isProcessTask ? 'Поля задаёт шаг процесса' : 'Поля задания'}
      </SectionTitle>
      {isEditingFields ? (
        <TaskFieldsEditor
          initialFields={fields}
          onCancel={() => setIsEditingFields(false)}
          onSave={(nextFields) =>
            runAction(
              async () => {
                await callAppRoute('/docflow/tasks/form', { taskId, fields: nextFields });
                setIsEditingFields(false);
              },
              'Поля сохранены',
              'Не удалось сохранить поля',
            )
          }
        />
      ) : (
        <FormFieldInputs fields={fields} values={values} disabled={isBusy || isDone} onChange={setDraftValues} />
      )}
      {errorMessage !== undefined && <Message tone="danger">{errorMessage}</Message>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
        {!isDone && (
          <Button
            variant="solid"
            size="sm"
            loading={isBusy}
            onClick={() =>
              runAction(
                () => callAppRoute('/docflow/tasks/complete', { taskId, values }),
                'Задание выполнено',
                'Не удалось выполнить задание',
              )
            }
          >
            Выполнить
          </Button>
        )}
        {!isDone && draftValues !== undefined && (
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() =>
              runAction(
                () => callAppRoute('/docflow/tasks/form', { taskId, values }),
                'Сохранено',
                'Не удалось сохранить',
              )
            }
          >
            Сохранить
          </Button>
        )}
      </div>
    </div>
  );
};
