import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, navigate } from 'twenty-sdk/front-component';
import { IconPencil, IconPlayerPlay, IconSettings, IconTrash } from 'twenty-ui/icon';
import { Tag } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';

import { callAppRoute, createRecord, deleteRecord, getErrorMessage, listRecords, updateRecord } from 'src/front/api';
import { useAsync, useDebouncedValue } from 'src/front/hooks/use-async';
import { DataTable, DocflowRoot, Message, SplitView, type TableSort, Toolbar } from 'src/front/ui/components';
import { Button, PromptDialog, SearchWithFilters } from 'src/front/ui/kit';
import { FormFieldInputs } from 'src/front/ui/form-field-inputs';
import { restAnd, restEq, restIlike, restIn } from 'src/shared/api/rest-filter.util';
import { DOCFLOW_SECTION } from 'src/shared/docflow.constants';
import { type FormField, type FormValues } from 'src/shared/form/form-field.type';
import { findMissingRequiredFields } from 'src/shared/form/form-fields.util';
import { logDocflow, logDocflowError } from 'src/shared/log.util';
import {
  buildLaunchParameters,
  isLaunchableTrigger,
  isLaunchParametersStep,
  parseLaunchFields,
} from 'src/shared/workflow/launch-step.util';
import { type WorkflowStep, type WorkflowTrigger } from 'src/shared/workflow/workflow-run.type';
import { PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const PROCESSES_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 300;
const DRAFT_WAIT_ATTEMPTS = 10;
const DRAFT_WAIT_MS = 400;

type Panel = { kind: 'closed' } | { kind: 'process'; workflowId: string };
type StatusFilter = 'all' | 'active' | 'draft';

type WorkflowRecord = { id: string; name?: string | null; smbLaunchFields?: unknown };
type WorkflowVersionRecord = {
  id: string;
  workflowId: string;
  status?: string | null;
  trigger?: WorkflowTrigger | null;
  steps?: WorkflowStep[] | null;
};

type DocflowProcess = {
  workflowId: string;
  // The published version people launch; none while the process is a draft
  workflowVersionId: string | undefined;
  name: string;
  isPublished: boolean;
  launchFields: FormField[];
  stageNames: string[];
};

const stageNamesOf = (version: WorkflowVersionRecord | undefined) =>
  (version?.steps ?? []).filter((step) => !isLaunchParametersStep(step)).map((step) => step.name);

// Docflow processes are the standard workflows with the docflow section:
// published ones started by hand are launched here, drafts are shown to be
// finished in the editor. Both lists are filtered by the server.
const loadProcesses = async (searchQuery: string): Promise<DocflowProcess[]> => {
  const { records: workflows } = await listRecords<WorkflowRecord>('workflows', {
    filter: restAnd(
      restEq('smbSection', DOCFLOW_SECTION),
      searchQuery.trim().length > 0 ? restIlike('name', searchQuery) : undefined,
    ),
    order_by: 'name[AscNullsLast]',
    limit: PROCESSES_LIMIT,
  });

  if (workflows.length === 0) {
    return [];
  }

  const { records: versions } = await listRecords<WorkflowVersionRecord>('workflowVersions', {
    filter: restAnd(
      restIn('status', ['ACTIVE', 'DRAFT']),
      restIn('workflowId', workflows.map(({ id }) => id)),
    ),
    limit: PROCESSES_LIMIT * 2,
  });

  return workflows.map((workflow) => {
    const active = versions.find(
      (version) => version.workflowId === workflow.id && version.status === 'ACTIVE' && isLaunchableTrigger(version.trigger),
    );
    const draft = versions.find((version) => version.workflowId === workflow.id && version.status === 'DRAFT');

    return {
      workflowId: workflow.id,
      workflowVersionId: active?.id,
      name: workflow.name?.trim() || 'Без названия',
      isPublished: active !== undefined,
      launchFields: parseLaunchFields(workflow.smbLaunchFields),
      stageNames: stageNamesOf(active ?? draft),
    };
  });
};

const openEditor = (workflowId: string) =>
  navigate(AppPath.RecordShowPage, { objectNameSingular: 'workflow', objectRecordId: workflowId });

const ProcessLaunchForm = ({
  process,
  onLaunched,
}: {
  process: DocflowProcess;
  onLaunched: () => void;
}) => {
  const theme = useTheme();
  const [values, setValues] = useState<FormValues>({});
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleLaunch = async () => {
    const parameters = buildLaunchParameters({ fields: process.launchFields, values });
    const missingFields = findMissingRequiredFields({ fields: process.launchFields, values: parameters });

    if (missingFields.length > 0) {
      setErrorMessage(`Заполните: ${missingFields.map(({ label }) => label).join(', ')}`);

      return;
    }

    setIsLaunching(true);
    setErrorMessage(undefined);

    try {
      await callAppRoute('/docflow/processes/launch', {
        workflowVersionId: process.workflowVersionId ?? '',
        values: parameters,
      });
      await enqueueSnackbar({ message: 'Процесс запущен', variant: 'success' });
      onLaunched();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Не удалось запустить процесс'));
    } finally {
      setIsLaunching(false);
    }
  };

  if (!process.isPublished) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
        <Message>Процесс ещё не опубликован: доделайте его в редакторе и нажмите «Активировать».</Message>
        <Button variant="solid" size="md" fullWidth icon={IconSettings} onClick={() => void openEditor(process.workflowId)}>
          Открыть редактор
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
      {process.stageNames.length > 0 && (
        <Message>Этапы: {process.stageNames.join(' → ')}</Message>
      )}
      {process.launchFields.length > 0 ? (
        <FormFieldInputs fields={process.launchFields} values={values} onChange={setValues} disabled={isLaunching} />
      ) : (
        <Message>Процесс запускается без параметров.</Message>
      )}
      {errorMessage !== undefined && <Message tone="danger">{errorMessage}</Message>}
      <Button variant="solid" size="md" fullWidth loading={isLaunching} onClick={() => void handleLaunch()}>
        Запустить
      </Button>
      <Button variant="ghost" size="sm" icon={IconSettings} onClick={() => void openEditor(process.workflowId)}>
        Изменить процесс
      </Button>
    </div>
  );
};

// The server gives a new workflow its first draft version right after the
// record; the launch step can only be put into an existing draft.
const waitForDraft = async (workflowId: string) => {
  for (let attempt = 0; attempt < DRAFT_WAIT_ATTEMPTS; attempt++) {
    const { records } = await listRecords<{ id: string }>('workflowVersions', {
      filter: restEq('workflowId', workflowId),
      limit: 1,
    });

    if (records.length > 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, DRAFT_WAIT_MS));
  }
};

const DocflowProcesses = () => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<TableSort>({ key: 'name', direction: 'asc' });
  const [panel, setPanel] = useState<Panel>({ kind: 'closed' });
  const [renaming, setRenaming] = useState<DocflowProcess | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const { data: loaded, loading, error, reload } = useAsync(() => loadProcesses(searchQuery), [searchQuery]);
  const selectedWorkflowId = panel.kind === 'process' ? panel.workflowId : undefined;
  const selectedProcess = loaded?.find((process) => process.workflowId === selectedWorkflowId);

  // The list is short: filtered and sorted here
  const processes = (loaded ?? [])
    .filter((process) =>
      statusFilter === 'all' ? true : statusFilter === 'active' ? process.isPublished : !process.isPublished,
    )
    .sort((first, second) => {
      const direction = sort.direction === 'asc' ? 1 : -1;

      if (sort.key === 'parameters') {
        return (first.launchFields.length - second.launchFields.length) * direction;
      }

      if (sort.key === 'status') {
        return (Number(first.isPublished) - Number(second.isPublished)) * direction;
      }

      return first.name.localeCompare(second.name, 'ru') * direction;
    });

  // The process goes to the Twenty trash ("Рабочие процессы → Удалённые"),
  // its runs and tasks stay.
  const handleDeleteProcess = async (process: DocflowProcess) => {
    try {
      await deleteRecord('workflows', process.workflowId);
      setPanel((current) =>
        current.kind === 'process' && current.workflowId === process.workflowId ? { kind: 'closed' } : current,
      );
      await enqueueSnackbar({ message: `Процесс «${process.name}» удалён`, variant: 'success' });
      await reload();
    } catch (deleteError) {
      logDocflowError('process: delete failed', deleteError, { workflowId: process.workflowId });
      await enqueueSnackbar({ message: getErrorMessage(deleteError, 'Не удалось удалить процесс'), variant: 'error' });
    }
  };

  const handleRenameProcess = async (process: DocflowProcess, name: string) => {
    try {
      await updateRecord('workflows', process.workflowId, { name });
      await enqueueSnackbar({ message: 'Процесс переименован', variant: 'success' });
      setRenaming(undefined);
      await reload();
    } catch (renameError) {
      await enqueueSnackbar({ message: getErrorMessage(renameError, 'Не удалось переименовать процесс'), variant: 'error' });
    }
  };

  // As "Создать" of the standard list: a process with a manual trigger in the
  // docflow section, opened in the editor. Launch parameters are set later
  // with the process's "Параметры запуска" command.
  const handleCreate = async () => {
    setIsCreating(true);
    logDocflow('process: create');

    try {
      const workflow = await createRecord<WorkflowRecord>('workflows', {
        name: 'Новый процесс',
        smbSection: DOCFLOW_SECTION,
      });

      if (workflow === undefined) {
        throw new Error('процесс создан, но сервер его не вернул');
      }

      await waitForDraft(workflow.id);
      await callAppRoute('/docflow/processes/launch-fields', { workflowId: workflow.id, fields: [] });
      await navigate(AppPath.RecordShowPage, {
        objectNameSingular: 'workflow',
        objectRecordId: workflow.id,
      });
    } catch (createError) {
      logDocflowError('process: create failed', createError);
      await enqueueSnackbar({
        message: getErrorMessage(createError, 'Не удалось создать процесс'),
        variant: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DocflowRoot>
      <SplitView
        panelTitle={selectedProcess?.name}
        onClosePanel={() => setPanel({ kind: 'closed' })}
        panel={
          selectedProcess !== undefined ? (
            <ProcessLaunchForm
              key={selectedProcess.workflowId}
              process={selectedProcess}
              onLaunched={() => setPanel({ kind: 'closed' })}
            />
          ) : undefined
        }
      >
        <Toolbar>
          <SearchWithFilters
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Поиск процессов"
            activeFilterCount={statusFilter === 'all' ? 0 : 1}
            onResetFilters={() => setStatusFilter('all')}
            filters={[
              {
                key: 'status',
                title: 'Статус',
                value: statusFilter,
                options: [
                  { value: 'all', label: 'Все' },
                  { value: 'active', label: 'Опубликованные' },
                  { value: 'draft', label: 'Черновики' },
                ],
                onChange: (value) => setStatusFilter(value as StatusFilter),
              },
            ]}
          />
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="solid" size="sm" loading={isCreating} onClick={() => void handleCreate()}>
              Создать
            </Button>
          </div>
        </Toolbar>
        {error !== undefined && (
          <div style={{ padding: theme.spacing[4] }}>
            <Message tone="danger">{getErrorMessage(error, 'Не удалось загрузить процессы')}</Message>
          </div>
        )}
        {loading && loaded === undefined && <Message>Загрузка…</Message>}
        {!loading && error === undefined && processes.length === 0 && (
          <Message>Процессов нет. «Создать» добавит процесс в раздел «Документооборот».</Message>
        )}
        {processes.length > 0 && (
          <DataTable
            columns={[
              { key: 'name', label: 'Процесс', width: '36%', sortKey: 'name' },
              { key: 'status', label: 'Статус', width: '18%', sortKey: 'status' },
              { key: 'parameters', label: 'Параметры', width: '14%', sortKey: 'parameters' },
              { key: 'stages', label: 'Этапы' },
            ]}
            sort={sort}
            onSortChange={setSort}
            selectedRowId={selectedWorkflowId}
            onRowClick={(workflowId) => setPanel({ kind: 'process', workflowId })}
            rowActions={(workflowId) => {
              const process = processes.find((candidate) => candidate.workflowId === workflowId);

              if (process === undefined) {
                return [];
              }

              return [
                ...(process.isPublished
                  ? [{ key: 'launch', label: 'Запустить', icon: IconPlayerPlay, onSelect: () => setPanel({ kind: 'process', workflowId }) }]
                  : []),
                { key: 'edit', label: 'Открыть редактор', icon: IconSettings, onSelect: () => void openEditor(workflowId) },
                { key: 'rename', label: 'Переименовать', icon: IconPencil, onSelect: () => setRenaming(process) },
                {
                  key: 'delete',
                  label: 'Удалить',
                  confirmLabel: 'Точно удалить?',
                  icon: IconTrash,
                  tone: 'danger' as const,
                  onSelect: () => void handleDeleteProcess(process),
                },
              ];
            }}
            rows={processes.map((process) => {
              const parameterCount = process.launchFields.length;

              return {
                id: process.workflowId,
                cells: {
                  name: process.name,
                  status: (
                    <Tag color={process.isPublished ? 'green' : 'gray'}>
                      {process.isPublished ? 'Опубликован' : 'Черновик'}
                    </Tag>
                  ),
                  parameters: parameterCount > 0 ? String(parameterCount) : 'нет',
                  stages: process.stageNames.join(' → '),
                },
              };
            })}
          />
        )}
      </SplitView>
      {renaming !== undefined && (
        <PromptDialog
          title="Переименовать процесс"
          label="Название"
          initialValue={renaming.name}
          onClose={() => setRenaming(undefined)}
          onSubmit={(name) => handleRenameProcess(renaming, name)}
        />
      )}
    </DocflowRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'docflow-processes',
  description: 'Процессы документооборота: запуск с параметрами',
  component: DocflowProcesses,
});
