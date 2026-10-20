import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, openSidePanelPage } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { Tag } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';

import { createRecord, getErrorMessage, listRecords } from 'src/front/api';
import { formatDate, formatMemberName, isOverdue, TASK_STATUS_LABELS } from 'src/front/format';
import { useAsync, useDebouncedValue } from 'src/front/hooks/use-async';
import { useWorkspaceMembers } from 'src/front/hooks/use-workspace-members';
import { type DocflowTask } from 'src/front/types';
import {
  DataTable,
  DocflowRoot,
  Message,
  SectionTitle,
  SelectField,
  SplitView,
  TextAreaField,
  TextField,
  Toolbar,
} from 'src/front/ui/components';
import { FormFieldsBuilder } from 'src/front/ui/form-fields-builder';
import { TaskWorkPanel } from 'src/front/ui/task-work-panel';
import {
  restAnd,
  restEq,
  restIlike,
  restIsNotNull,
  restIsNull,
  restLt,
  restNeq,
  restOr,
} from 'src/shared/api/rest-filter.util';
import { DOCFLOW_SECTION, PAGE_SIZE, TASK_DONE_STATUS, TASK_TODO_STATUS } from 'src/shared/docflow.constants';
import { type FormField } from 'src/shared/form/form-field.type';
import { getFormFieldsError } from 'src/shared/form/form-fields.util';
import { TASKS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

type TaskFilter = 'open' | 'mine' | 'overdue' | 'done' | 'archived';
type TaskSort = 'newest' | 'oldest' | 'dueSoon' | 'nameAsc';
type Panel = { kind: 'closed' } | { kind: 'create' } | { kind: 'task'; taskId: string };

const SEARCH_DEBOUNCE_MS = 300;
const NO_ASSIGNEE = '';

const ORDER_BY: Record<TaskSort, string> = {
  newest: 'createdAt[DescNullsLast]',
  oldest: 'createdAt[AscNullsLast]',
  dueSoon: 'dueAt[AscNullsLast]',
  nameAsc: 'title[AscNullsLast]',
};

const OPEN_FILTER = restOr(restNeq('status', TASK_DONE_STATUS), restIsNull('status'));

// An archived task opens in its standard card: Twenty shows it as deleted
// there and offers to restore it.
const openArchivedTask = (taskId: string) =>
  openSidePanelPage({
    to: AppPath.RecordShowPage,
    params: { objectNameSingular: 'task', objectRecordId: taskId },
    pageTitle: 'Задание',
  });

// The list is filtered by the server, so a long history of tasks never
// travels to the browser.
const buildFilter = ({
  taskFilter,
  searchQuery,
  currentMemberId,
  now,
}: {
  taskFilter: TaskFilter;
  searchQuery: string;
  currentMemberId: string | undefined;
  now: string;
}) =>
  restAnd(
    restEq('smbSection', DOCFLOW_SECTION),
    // Archived = deleted in Twenty (kept in its trash): any status
    taskFilter === 'archived'
      ? restIsNotNull('deletedAt')
      : taskFilter === 'done'
        ? restEq('status', TASK_DONE_STATUS)
        : OPEN_FILTER,
    taskFilter === 'mine'
      ? currentMemberId !== undefined
        ? restEq('assigneeId', currentMemberId)
        : restIsNull('assigneeId')
      : undefined,
    taskFilter === 'overdue' ? restLt('dueAt', now) : undefined,
    searchQuery.trim().length > 0 ? restIlike('title', searchQuery) : undefined,
  );

const TaskCreateForm = ({
  currentMemberId,
  onCreated,
  onCancel,
}: {
  currentMemberId: string | undefined;
  onCreated: (taskId: string) => void;
  onCancel: () => void;
}) => {
  const theme = useTheme();
  const { members } = useWorkspaceMembers();
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentMemberId ?? NO_ASSIGNEE);
  const [dueAt, setDueAt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleCreate = async () => {
    const fieldsError = getFormFieldsError(fields);

    if (fieldsError !== undefined) {
      setErrorMessage(fieldsError);

      return;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      const task = await createRecord<DocflowTask>('tasks', {
        title: title.trim(),
        assigneeId: assigneeId === NO_ASSIGNEE ? null : assigneeId,
        dueAt: /^\d{4}-\d{2}-\d{2}$/.test(dueAt) ? dueAt : null,
        status: TASK_TODO_STATUS,
        smbSection: DOCFLOW_SECTION,
        smbInstruction: instruction.trim().length > 0 ? instruction.trim() : null,
        smbFormSchema: fields.length > 0 ? fields : null,
        smbFormValues: fields.length > 0 ? {} : null,
      });

      if (task === undefined) {
        throw new Error('The created task was not returned');
      }

      await enqueueSnackbar({ message: 'Задание создано', variant: 'success' });
      onCreated(task.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось создать задание'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
      <TextField label="Название" value={title} onChange={setTitle} />
      <SelectField
        label="Исполнитель"
        value={assigneeId}
        options={[
          { value: NO_ASSIGNEE, label: 'Не назначен' },
          ...members.map((member) => ({ value: member.id, label: formatMemberName(member) || member.id })),
        ]}
        onChange={setAssigneeId}
      />
      <TextField label="Срок" type="date" value={dueAt} onChange={setDueAt} />
      <TextAreaField label="Инструкция" value={instruction} onChange={setInstruction} rows={4} />
      <SectionTitle>Поля для заполнения</SectionTitle>
      <FormFieldsBuilder fields={fields} onChange={setFields} disabled={isSaving} />
      {errorMessage !== undefined && <Message tone="danger">{errorMessage}</Message>}
      <div style={{ display: 'flex', gap: theme.spacing[2] }}>
        <Button variant="solid" size="sm" loading={isSaving} disabled={title.trim().length === 0} onClick={() => void handleCreate()}>
          Создать
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  );
};

const DocflowTasks = () => {
  const theme = useTheme();
  const { members, currentMember } = useWorkspaceMembers();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('open');
  const [sort, setSort] = useState<TaskSort>('newest');
  const [panel, setPanel] = useState<Panel>({ kind: 'closed' });
  const [pages, setPages] = useState(1);
  // Fixed for the life of the list, so "overdue" does not refetch by itself.
  const [now] = useState(() => new Date().toISOString());

  const { data, loading, error, reload } = useAsync(
    () =>
      listRecords<DocflowTask>('tasks', {
        filter: buildFilter({ taskFilter, searchQuery, currentMemberId: currentMember?.id, now }),
        order_by: ORDER_BY[sort],
        limit: PAGE_SIZE * pages,
      }),
    [taskFilter, searchQuery, currentMember?.id, sort, pages, now],
  );
  const tasks = data?.records ?? [];

  return (
    <DocflowRoot>
      <SplitView
        panelTitle={panel.kind === 'create' ? 'Новое задание' : 'Задание'}
        onClosePanel={() => setPanel({ kind: 'closed' })}
        panel={
          panel.kind === 'create' ? (
            <TaskCreateForm
              currentMemberId={currentMember?.id}
              onCancel={() => setPanel({ kind: 'closed' })}
              onCreated={(taskId) => {
                setPanel({ kind: 'task', taskId });
                void reload();
              }}
            />
          ) : panel.kind === 'task' ? (
            <TaskWorkPanel key={panel.taskId} taskId={panel.taskId} onChanged={() => void reload()} />
          ) : undefined
        }
      >
        <Toolbar>
          <div style={{ flex: '0 1 240px' }}>
            <TextField
              type="search"
              variant="bare"
              placeholder="Поиск заданий"
              value={searchInput}
              onChange={setSearchInput}
            />
          </div>
          <SelectField<TaskFilter>
            variant="bare"
            value={taskFilter}
            options={[
              { value: 'open', label: 'Открытые' },
              { value: 'mine', label: 'Мои' },
              { value: 'overdue', label: 'Просроченные' },
              { value: 'done', label: 'Выполненные' },
              { value: 'archived', label: 'Архив' },
            ]}
            onChange={(value) => {
              setTaskFilter(value);
              setPages(1);
            }}
          />
          <SelectField<TaskSort>
            variant="bare"
            value={sort}
            options={[
              { value: 'newest', label: 'Сначала новые' },
              { value: 'oldest', label: 'Сначала старые' },
              { value: 'dueSoon', label: 'По сроку' },
              { value: 'nameAsc', label: 'По названию' },
            ]}
            onChange={setSort}
          />
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="outline" size="sm" onClick={() => setPanel({ kind: 'create' })}>
              Создать
            </Button>
          </div>
        </Toolbar>
        {error !== undefined && (
          <div style={{ padding: theme.spacing[4] }}>
            <Message tone="danger">{getErrorMessage(error, 'Не удалось загрузить задания')}</Message>
          </div>
        )}
        {loading && tasks.length === 0 && <Message>Загрузка…</Message>}
        {!loading && error === undefined && tasks.length === 0 && <Message>Заданий нет.</Message>}
        {tasks.length > 0 && (
          <DataTable
            columns={[
              { key: 'title', label: 'Задание', width: '40%' },
              { key: 'assignee', label: 'Исполнитель', width: '24%' },
              { key: 'dueAt', label: 'Срок', width: '16%' },
              { key: 'status', label: 'Статус' },
            ]}
            selectedRowId={panel.kind === 'task' ? panel.taskId : undefined}
            onRowClick={(taskId) =>
              taskFilter === 'archived'
                ? void openArchivedTask(taskId)
                : setPanel({ kind: 'task', taskId })
            }
            rows={tasks.map((task) => ({
              id: task.id,
              cells: {
                title: task.title?.trim() || 'Без названия',
                assignee: formatMemberName(members.find((member) => member.id === task.assigneeId)),
                dueAt: (
                  <span style={{ color: isOverdue(task.dueAt, task.status, new Date(now)) ? theme.font.color.danger : undefined }}>
                    {formatDate(task.dueAt)}
                  </span>
                ),
                status: (
                  <Tag color={task.status === TASK_DONE_STATUS ? 'green' : 'gray'}>
                    {TASK_STATUS_LABELS[task.status ?? ''] ?? task.status ?? 'Без статуса'}
                  </Tag>
                ),
              },
            }))}
          />
        )}
        {data?.pageInfo.hasNextPage === true && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing[3] }}>
            <Button variant="ghost" size="sm" loading={loading} onClick={() => setPages((current) => current + 1)}>
              Показать ещё
            </Button>
          </div>
        )}
      </SplitView>
    </DocflowRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: TASKS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'docflow-tasks',
  description: 'Задания документооборота: штатные задачи с разделом «Документооборот»',
  component: DocflowTasks,
});
