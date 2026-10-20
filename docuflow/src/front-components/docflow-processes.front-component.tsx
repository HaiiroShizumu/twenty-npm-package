import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, navigate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';

import { callAppRoute, createRecord, getErrorMessage, listRecords } from 'src/front/api';
import { useAsync, useDebouncedValue } from 'src/front/hooks/use-async';
import { DataTable, DocflowRoot, Message, SplitView, TextField, Toolbar } from 'src/front/ui/components';
import { FormFieldInputs } from 'src/front/ui/form-field-inputs';
import { FormFieldsBuilder } from 'src/front/ui/form-fields-builder';
import { restAnd, restEq, restIlike, restIn } from 'src/shared/api/rest-filter.util';
import { DOCFLOW_SECTION, LAUNCH_PARAMETERS_STEP_NAME } from 'src/shared/docflow.constants';
import { type FormField, type FormValues } from 'src/shared/form/form-field.type';
import { findMissingRequiredFields, getFormFieldsError } from 'src/shared/form/form-fields.util';
import { logDocflow, logDocflowError } from 'src/shared/log.util';
import {
  buildLaunchParameters,
  isLaunchParametersStep,
  parseLaunchFields,
} from 'src/shared/workflow/launch-step.util';
import { type WorkflowStep, type WorkflowTrigger } from 'src/shared/workflow/workflow-run.type';
import { PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const PROCESSES_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 300;
const DRAFT_WAIT_ATTEMPTS = 10;
const DRAFT_WAIT_MS = 400;

type ProcessKind = 'plain' | 'parameters';

type Panel = { kind: 'closed' } | { kind: 'process'; workflowVersionId: string } | { kind: 'new' };

type WorkflowRecord = { id: string; name?: string | null; smbLaunchFields?: unknown };
type WorkflowVersionRecord = {
  id: string;
  workflowId: string;
  trigger?: WorkflowTrigger | null;
  steps?: WorkflowStep[] | null;
};

type DocflowProcess = {
  workflowId: string;
  workflowVersionId: string;
  name: string;
  launchFields: FormField[];
  stageNames: string[];
};

// Docflow processes are the standard workflows with the docflow section,
// published, started by hand. Both lists are filtered by the server.
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
      restEq('status', 'ACTIVE'),
      restIn('workflowId', workflows.map(({ id }) => id)),
    ),
    limit: PROCESSES_LIMIT,
  });

  return workflows.flatMap((workflow) => {
    const version = versions.find((candidate) => candidate.workflowId === workflow.id);

    if (version === undefined || version.trigger?.type !== 'MANUAL') {
      return [];
    }

    return [
      {
        workflowId: workflow.id,
        workflowVersionId: version.id,
        name: workflow.name?.trim() || 'Без названия',
        launchFields: parseLaunchFields(workflow.smbLaunchFields),
        stageNames: (version.steps ?? [])
          .filter((step) => !isLaunchParametersStep(step))
          .map((step) => step.name),
      },
    ];
  });
};

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
        workflowVersionId: process.workflowVersionId,
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          void navigate(AppPath.RecordShowPage, {
            objectNameSingular: 'workflow',
            objectRecordId: process.workflowId,
          })
        }
      >
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

const NewProcessForm = () => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ProcessKind>('parameters');
  const [fields, setFields] = useState<FormField[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Created in the docflow section with a manual trigger; "with parameters"
  // also gets the "Launch with parameters" step right after the trigger, its
  // fields being variables for every later step. Then the standard editor.
  const handleCreate = async () => {
    const launchFields = kind === 'parameters' ? fields : [];
    const fieldsError = getFormFieldsError(launchFields);

    if (kind === 'parameters' && launchFields.length === 0) {
      setErrorMessage('Добавьте хотя бы одно поле или выберите обычный процесс');

      return;
    }

    if (fieldsError !== undefined) {
      setErrorMessage(fieldsError);

      return;
    }

    setIsCreating(true);
    setErrorMessage(undefined);
    logDocflow('process: create', { kind, fieldCount: launchFields.length });

    try {
      const workflow = await createRecord<WorkflowRecord>('workflows', {
        name: name.trim() || 'Новый процесс',
        smbSection: DOCFLOW_SECTION,
      });

      if (workflow === undefined) {
        throw new Error('процесс создан, но сервер его не вернул');
      }

      await waitForDraft(workflow.id);
      await callAppRoute('/docflow/processes/launch-fields', {
        workflowId: workflow.id,
        fields: launchFields,
      });
      await navigate(AppPath.RecordShowPage, {
        objectNameSingular: 'workflow',
        objectRecordId: workflow.id,
      });
    } catch (createError) {
      logDocflowError('process: create failed', createError);
      setErrorMessage(getErrorMessage(createError, 'Не удалось создать процесс'));
    } finally {
      setIsCreating(false);
    }
  };

  const kindButton = (value: ProcessKind, label: string) => (
    <Button
      variant={kind === value ? 'solid' : 'outline'}
      size="sm"
      disabled={isCreating}
      onClick={() => setKind(value)}
    >
      {label}
    </Button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
      <TextField label="Название" placeholder="Новый процесс" value={name} onChange={setName} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
        {kindButton('parameters', LAUNCH_PARAMETERS_STEP_NAME)}
        {kindButton('plain', 'Обычный процесс')}
      </div>
      {kind === 'parameters' ? (
        <>
          <Message tone="hint">
            Поля, которые человек заполняет перед запуском. В процессе появится шаг «
            {LAUNCH_PARAMETERS_STEP_NAME}», и следующие шаги берут значения из его переменных.
          </Message>
          <FormFieldsBuilder fields={fields} onChange={setFields} disabled={isCreating} />
        </>
      ) : (
        <Message tone="hint">Ручной запуск без параметров. Шаги добавляются в редакторе.</Message>
      )}
      {errorMessage !== undefined && <Message tone="danger">{errorMessage}</Message>}
      <Button variant="solid" size="md" fullWidth loading={isCreating} onClick={() => void handleCreate()}>
        Создать и открыть редактор
      </Button>
    </div>
  );
};

const DocflowProcesses = () => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [panel, setPanel] = useState<Panel>({ kind: 'closed' });
  const { data: processes, loading, error } = useAsync(() => loadProcesses(searchQuery), [searchQuery]);
  const selectedVersionId = panel.kind === 'process' ? panel.workflowVersionId : undefined;
  const selectedProcess = processes?.find((process) => process.workflowVersionId === selectedVersionId);

  return (
    <DocflowRoot>
      <SplitView
        panelTitle={panel.kind === 'new' ? 'Новый процесс' : selectedProcess?.name}
        onClosePanel={() => setPanel({ kind: 'closed' })}
        panel={
          panel.kind === 'new' ? (
            <NewProcessForm />
          ) : selectedProcess !== undefined ? (
            <ProcessLaunchForm
              key={selectedProcess.workflowVersionId}
              process={selectedProcess}
              onLaunched={() => setPanel({ kind: 'closed' })}
            />
          ) : undefined
        }
      >
        <Toolbar>
          <div style={{ flex: '0 1 240px' }}>
            <TextField
              type="search"
              variant="bare"
              placeholder="Поиск процессов"
              value={searchInput}
              onChange={setSearchInput}
            />
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="solid" size="sm" onClick={() => setPanel({ kind: 'new' })}>
              Создать
            </Button>
          </div>
        </Toolbar>
        {error !== undefined && (
          <div style={{ padding: theme.spacing[4] }}>
            <Message tone="danger">{getErrorMessage(error, 'Не удалось загрузить процессы')}</Message>
          </div>
        )}
        {loading && processes === undefined && <Message>Загрузка…</Message>}
        {!loading && error === undefined && processes?.length === 0 && (
          <Message>
            Процессов для запуска нет. Здесь видны опубликованные процессы с ручным запуском и разделом «Документооборот». Параметры запуска задаются командой процесса «Запуск и задания» (кнопка вверху карточки процесса).
          </Message>
        )}
        {processes !== undefined && processes.length > 0 && (
          <DataTable
            columns={[
              { key: 'name', label: 'Процесс', width: '40%' },
              { key: 'parameters', label: 'Параметры', width: '18%' },
              { key: 'stages', label: 'Этапы' },
            ]}
            selectedRowId={selectedVersionId}
            onRowClick={(workflowVersionId) => setPanel({ kind: 'process', workflowVersionId })}
            rows={processes.map((process) => {
              const parameterCount = process.launchFields.length;

              return {
                id: process.workflowVersionId,
                cells: {
                  name: process.name,
                  parameters: parameterCount > 0 ? String(parameterCount) : 'нет',
                  stages: process.stageNames.join(' → '),
                },
              };
            })}
          />
        )}
      </SplitView>
    </DocflowRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'docflow-processes',
  description: 'Процессы документооборота: запуск с параметрами',
  component: DocflowProcesses,
});
