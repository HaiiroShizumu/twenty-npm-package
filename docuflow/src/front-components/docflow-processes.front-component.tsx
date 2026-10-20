import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, navigate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';

import { callAppRoute, createRecord, getErrorMessage, listRecords } from 'src/front/api';
import { useAsync, useDebouncedValue } from 'src/front/hooks/use-async';
import { DataTable, DocflowRoot, Message, SplitView, TextField, Toolbar } from 'src/front/ui/components';
import { FormFieldInputs } from 'src/front/ui/form-field-inputs';
import { restAnd, restEq, restIlike, restIn } from 'src/shared/api/rest-filter.util';
import { DOCFLOW_SECTION } from 'src/shared/docflow.constants';
import { type FormField, type FormValues } from 'src/shared/form/form-field.type';
import { findMissingRequiredFields } from 'src/shared/form/form-fields.util';
import {
  buildLaunchParameters,
  isLaunchParametersStep,
  parseLaunchFields,
} from 'src/shared/workflow/launch-step.util';
import { type WorkflowStep, type WorkflowTrigger } from 'src/shared/workflow/workflow-run.type';
import { PROCESSES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const PROCESSES_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 300;

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

const DocflowProcesses = () => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const { data: processes, loading, error } = useAsync(() => loadProcesses(searchQuery), [searchQuery]);
  const selectedProcess = processes?.find((process) => process.workflowVersionId === selectedVersionId);

  // Created in the docflow section, then opened in the standard editor.
  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const workflow = await createRecord<WorkflowRecord>('workflows', {
        name: 'Новый процесс',
        smbSection: DOCFLOW_SECTION,
      });

      if (workflow !== undefined) {
        await navigate(AppPath.RecordShowPage, {
          objectNameSingular: 'workflow',
          objectRecordId: workflow.id,
        });
      }
    } catch (createError) {
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
        onClosePanel={() => setSelectedVersionId(undefined)}
        panel={
          selectedProcess !== undefined ? (
            <ProcessLaunchForm
              key={selectedProcess.workflowVersionId}
              process={selectedProcess}
              onLaunched={() => setSelectedVersionId(undefined)}
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
            <Button variant="outline" size="sm" loading={isCreating} onClick={() => void handleCreate()}>
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
            Процессов для запуска нет. Здесь видны опубликованные процессы с ручным запуском и разделом «Документооборот». Параметры запуска задаются на вкладке процесса «Запуск и задания».
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
            onRowClick={setSelectedVersionId}
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
