import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar, useSelectedRecordIds } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';

import { callAppRoute, getErrorMessage, getRecord, listRecords } from 'src/front/api';
import { formatMemberName } from 'src/front/format';
import { useAsync } from 'src/front/hooks/use-async';
import { useWorkspaceMembers } from 'src/front/hooks/use-workspace-members';
import {
  CheckboxField,
  DocflowRoot,
  Message,
  SectionTitle,
  SelectField,
  TextField,
  VariableChip,
} from 'src/front/ui/components';
import { FormFieldsBuilder } from 'src/front/ui/form-fields-builder';
import { restAnd, restEq } from 'src/shared/api/rest-filter.util';
import { LAUNCH_PARAMETERS_STEP_NAME } from 'src/shared/docflow.constants';
import { type FormField } from 'src/shared/form/form-field.type';
import { getFillableFormFields, getFormFieldsError, parseFormFields } from 'src/shared/form/form-fields.util';
import { readStepSettings, type StepSettings } from 'src/shared/form/step-settings.util';
import { findLaunchParametersStep, parseLaunchFields } from 'src/shared/workflow/launch-step.util';
import { type WorkflowStep } from 'src/shared/workflow/workflow-run.type';
import { getFormStepFields, isFormStep } from 'src/shared/workflow/workflow-run.util';
import { logDocflow, logDocflowError } from 'src/shared/log.util';
import { PROCESS_STEPS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const NO_ASSIGNEE = '';

type DraftVersion = { id: string; steps?: WorkflowStep[] | null };
type ProcessRecord = { id: string; smbLaunchFields?: unknown };

const sectionStyle = { display: 'flex', flexDirection: 'column' as const };

const LaunchParametersEditor = ({
  workflowId,
  initialFields,
  launchStepId,
  onSaved,
}: {
  workflowId: string;
  initialFields: FormField[];
  launchStepId: string | undefined;
  onSaved: () => void;
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
    logDocflow('process: save launch fields', { workflowId, fields });

    try {
      const result = await callAppRoute('/docflow/processes/launch-fields', { workflowId, fields });

      logDocflow('process: launch fields saved', result);
      await enqueueSnackbar({
        message:
          fields.length > 0
            ? `Параметры сохранены: шаг «${LAUNCH_PARAMETERS_STEP_NAME}» стоит в черновике после запуска, опубликуйте процесс`
            : 'Параметры убраны',
        variant: 'success',
      });
      onSaved();
    } catch (error) {
      logDocflowError('process: save launch fields failed', error, { workflowId });
      setErrorMessage(getErrorMessage(error, 'Не удалось сохранить параметры'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section style={{ ...sectionStyle, gap: theme.spacing[2] }} aria-label={LAUNCH_PARAMETERS_STEP_NAME}>
      <SectionTitle>{LAUNCH_PARAMETERS_STEP_NAME}</SectionTitle>
      <Message tone="hint">
        Что человек заполняет перед запуском. Шаг «{LAUNCH_PARAMETERS_STEP_NAME}» встаёт после
        «Запуск вручную» сам: в следующих шагах значения выбираются в списке переменных этого шага,
        например сотрудник — в поле «Исполнитель».
      </Message>
      <FormFieldsBuilder
        fields={fields}
        onChange={setFields}
        variablePrefix={launchStepId}
        disabled={isSaving}
      />
      {errorMessage !== undefined && <Message tone="danger">{errorMessage}</Message>}
      <div>
        <Button variant="solid" size="sm" loading={isSaving} onClick={() => void save()}>
          Сохранить параметры
        </Button>
      </div>
    </section>
  );
};

const StepSettingsEditor = ({
  workflowVersionId,
  step,
}: {
  workflowVersionId: string;
  step: WorkflowStep;
}) => {
  const theme = useTheme();
  const { members } = useWorkspaceMembers();
  const fields = parseFormFields(getFormStepFields(step));
  const [settings, setSettings] = useState<StepSettings>(readStepSettings(fields));
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);

    try {
      await callAppRoute('/docflow/processes/step-settings', {
        workflowVersionId,
        stepId: step.id,
        settings,
      });
      await enqueueSnackbar({ message: 'Настройки шага сохранены', variant: 'success' });
    } catch (error) {
      await enqueueSnackbar({
        message: getErrorMessage(error, 'Не удалось сохранить настройки шага'),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRequired = (fieldId: string, isRequired: boolean) =>
    setSettings((current) => ({
      ...current,
      requiredFieldIds: isRequired
        ? [...current.requiredFieldIds, fieldId]
        : current.requiredFieldIds.filter((id) => id !== fieldId),
    }));

  return (
    <div
      style={{
        background: theme.background.transparent.lighter,
        borderRadius: theme.border.radius.md,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[2],
        padding: theme.spacing[3],
      }}
    >
      <strong>{step.name}</strong>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
        <div style={{ flex: '2 1 200px' }}>
          <SelectField
            label="Кто выполняет задание"
            value={settings.assignee ?? NO_ASSIGNEE}
            options={[
              { value: NO_ASSIGNEE, label: 'Запустивший процесс' },
              ...members.map((member) => ({ value: member.id, label: formatMemberName(member) || member.id })),
            ]}
            onChange={(assignee) =>
              setSettings((current) => ({ ...current, assignee: assignee === NO_ASSIGNEE ? null : assignee }))
            }
          />
        </div>
        <div style={{ flex: '1 1 120px' }}>
          <TextField
            label="Срок в днях"
            type="number"
            value={settings.dueInDays === null ? '' : String(settings.dueInDays)}
            onChange={(value) =>
              setSettings((current) => ({ ...current, dueInDays: value === '' ? null : Number(value) }))
            }
          />
        </div>
      </div>
      {getFillableFormFields(fields).map((field) => (
        <div key={field.id} style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
          <CheckboxField
            label={`${field.label} обязательное`}
            checked={settings.requiredFieldIds.includes(field.id)}
            onChange={(isRequired) => toggleRequired(field.id, isRequired)}
          />
          <VariableChip>{`{{${step.id}.${field.name}}}`}</VariableChip>
        </div>
      ))}
      <div>
        <Button variant="outline" size="sm" loading={isSaving} onClick={() => void save()}>
          Сохранить шаг
        </Button>
      </div>
    </div>
  );
};

// Tab of a workflow's record page: the parameters asked before the launch and
// who fills each "Human input" step of the draft, by when, which fields are
// required. The standard editor has no place for either.
const ProcessSteps = () => {
  const theme = useTheme();
  const [workflowId] = useSelectedRecordIds();
  const [launchEditorKey, setLaunchEditorKey] = useState(0);
  const { data, error, loading, reload } = useAsync(async () => {
    if (workflowId === undefined) {
      return undefined;
    }

    const [process, drafts] = await Promise.all([
      getRecord<ProcessRecord>('workflows', workflowId),
      listRecords<DraftVersion>('workflowVersions', {
        filter: restAnd(restEq('workflowId', workflowId), restEq('status', 'DRAFT')),
        limit: 1,
      }),
    ]);

    return { process, draft: drafts.records[0] };
  }, [workflowId]);
  const draft = data?.draft;
  const formSteps = draft?.steps?.filter(isFormStep) ?? [];

  // The steps are edited in the diagram next to this tab, so what was loaded
  // goes stale; read the draft again whenever the tab gets the focus back.
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        void reload();
      }
    };

    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [reload]);

  return (
    <DocflowRoot>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6], padding: theme.spacing[3] }}>
        {loading && data === undefined && <Message>Загрузка…</Message>}
        {error !== undefined && (
          <Message tone="danger">{getErrorMessage(error, 'Не удалось прочитать процесс')}</Message>
        )}
        {workflowId !== undefined && data?.process !== undefined && (
          <LaunchParametersEditor
            key={`${workflowId}:${launchEditorKey}`}
            workflowId={workflowId}
            initialFields={parseLaunchFields(data.process.smbLaunchFields)}
            launchStepId={findLaunchParametersStep(draft?.steps)?.id}
            onSaved={() => {
              void reload().then(() => setLaunchEditorKey((current) => current + 1));
            }}
          />
        )}
        {draft !== undefined && formSteps.length > 0 && (
          <section style={{ ...sectionStyle, gap: theme.spacing[2] }} aria-label="Задания шагов">
            <SectionTitle>Задания шагов «Человеческий ввод»</SectionTitle>
            <Message tone="hint">
              Каждый такой шаг становится заданием. Поля шага задаются в редакторе процесса; заполненные
              значения следующие шаги читают переменными, показанными рядом с полем.
            </Message>
            {formSteps.map((step) => (
              <StepSettingsEditor key={`${draft.id}:${step.id}`} workflowVersionId={draft.id} step={step} />
            ))}
          </section>
        )}
      </div>
    </DocflowRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: PROCESS_STEPS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'docflow-process-steps',
  description: 'Параметры запуска процесса и задания его шагов',
  component: ProcessSteps,
});
