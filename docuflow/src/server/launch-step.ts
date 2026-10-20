import {
  callCoreGraphql,
  CREATE_DRAFT_FROM_WORKFLOW_VERSION_MUTATION,
  DELETE_WORKFLOW_VERSION_STEP_MUTATION,
  UPDATE_WORKFLOW_VERSION_STEP_MUTATION,
  UPDATE_WORKFLOW_VERSION_TRIGGER_MUTATION,
} from 'src/shared/api/core-graphql.util';
import { LAUNCH_TRIGGER_NAME, TRIGGER_STEP_ID } from 'src/shared/docflow.constants';
import { type FormField } from 'src/shared/form/form-field.type';
import {
  buildFieldsExpectedBody,
  buildFieldsOutputSchema,
} from 'src/shared/form/form-field-builder.util';
import { findLaunchParametersStep, isLaunchTrigger } from 'src/shared/workflow/launch-step.util';
import { type WorkflowStep, type WorkflowTrigger } from 'src/shared/workflow/workflow-run.type';
import { listWorkflowVersions, type WorkflowVersionRecord } from 'src/server/records';

export type LaunchTriggerResult =
  | { status: 'SAVED'; workflowVersionId: string }
  | { status: 'NOT_MANUAL' };

const MANUAL_TRIGGER: WorkflowTrigger = {
  name: 'Запуск вручную',
  type: 'MANUAL',
  position: { x: 0, y: 0 },
  settings: {
    outputSchema: {},
    availability: { type: 'GLOBAL' },
    icon: 'IconPlayerPlay',
    isPinned: false,
  },
  nextStepIds: [],
};

// "Запуск с параметрами": the process starts with one trigger that carries
// the parameters. Twenty has no trigger type of its own for that, and its
// editor shows only metadata as variables of a manual trigger, so the trigger
// is a webhook: the editor offers the fields of its body as variables of the
// trigger ({{trigger.<field>}}). The webhook takes only requests with an API
// key; people launch the process from the docflow page, which runs the
// version with the parameters as the trigger output.
const buildLaunchTrigger = (base: WorkflowTrigger, fields: FormField[]): WorkflowTrigger => ({
  name: LAUNCH_TRIGGER_NAME,
  type: 'WEBHOOK',
  position: base.position ?? { x: 0, y: 0 },
  nextStepIds: base.nextStepIds ?? [],
  settings: {
    httpMethod: 'POST',
    authentication: 'API_KEY',
    expectedBody: buildFieldsExpectedBody(fields),
    outputSchema: buildFieldsOutputSchema(fields),
  },
});

const buildManualTrigger = (base: WorkflowTrigger): WorkflowTrigger => ({
  ...MANUAL_TRIGGER,
  position: base.position ?? MANUAL_TRIGGER.position,
  nextStepIds: base.nextStepIds ?? [],
});

// Only a draft can change: an existing one, or a new one copied from the
// latest version, as the editor does when a published process is edited.
const findOrCreateDraft = async (workflowId: string): Promise<WorkflowVersionRecord | undefined> => {
  const versions = await listWorkflowVersions('person', workflowId);
  const draft = versions.find(({ status }) => status === 'DRAFT');

  if (draft !== undefined || versions.length === 0) {
    return draft;
  }

  await callCoreGraphql({
    query: CREATE_DRAFT_FROM_WORKFLOW_VERSION_MUTATION,
    variables: { input: { workflowId, workflowVersionIdToCopy: versions[0].id } },
  });

  return (await listWorkflowVersions('person', workflowId)).find(({ status }) => status === 'DRAFT');
};

// Rows of the workflow canvas are this far apart
const STEP_ROW_HEIGHT = 150;

// Steps of processes from 0.0.6 and earlier read the parameters from the
// "Launch with parameters" step: {{<step id>.field}} now reads {{trigger.field}}.
const retargetStepVariables = (step: WorkflowStep, launchStepId: string): WorkflowStep | undefined => {
  const settings = JSON.stringify(step.settings ?? {});
  const retargeted = settings.split(`{{${launchStepId}.`).join(`{{${TRIGGER_STEP_ID}.`);

  return retargeted === settings ? undefined : { ...step, settings: JSON.parse(retargeted) };
};

const removeLegacyLaunchStep = async (draft: WorkflowVersionRecord) => {
  const launchStep = findLaunchParametersStep(draft.steps);

  if (launchStep === undefined) {
    return;
  }

  await callCoreGraphql({
    query: DELETE_WORKFLOW_VERSION_STEP_MUTATION,
    variables: { input: { workflowVersionId: draft.id, stepId: launchStep.id } },
  });

  const removedY = launchStep.position?.y;

  for (const step of draft.steps ?? []) {
    if (step.id === launchStep.id) {
      continue;
    }

    const retargeted = retargetStepVariables(step, launchStep.id);
    // Steps under the removed one move up into its row
    const movesUp =
      typeof removedY === 'number' && typeof step.position?.y === 'number' && step.position.y > removedY;

    if (retargeted === undefined && !movesUp) {
      continue;
    }

    const updated = retargeted ?? step;

    await callCoreGraphql({
      query: UPDATE_WORKFLOW_VERSION_STEP_MUTATION,
      variables: {
        input: {
          workflowVersionId: draft.id,
          step:
            movesUp && step.position
              ? { ...updated, position: { ...step.position, y: step.position.y - STEP_ROW_HEIGHT } }
              : updated,
        },
      },
    });
  }
};

// With parameters the draft starts with "Запуск с параметрами", without them
// with a plain "Запуск вручную". Any other trigger (record events, schedule,
// a webhook of its own) is left alone.
export const syncLaunchTrigger = async ({
  workflowId,
  fields,
}: {
  workflowId: string;
  fields: FormField[];
}): Promise<LaunchTriggerResult | undefined> => {
  const draft = await findOrCreateDraft(workflowId);

  if (draft === undefined) {
    return undefined;
  }

  const current = draft.trigger ?? MANUAL_TRIGGER;

  if (current.type !== 'MANUAL' && !isLaunchTrigger(current)) {
    return { status: 'NOT_MANUAL' };
  }

  await removeLegacyLaunchStep(draft);

  // The legacy step's removal relinked the trigger: read it again
  const trigger =
    (await listWorkflowVersions('person', workflowId)).find(({ id }) => id === draft.id)?.trigger ??
    current;

  await callCoreGraphql({
    query: UPDATE_WORKFLOW_VERSION_TRIGGER_MUTATION,
    variables: {
      input: {
        workflowVersionId: draft.id,
        trigger: fields.length > 0 ? buildLaunchTrigger(trigger, fields) : buildManualTrigger(trigger),
      },
    },
  });

  return { status: 'SAVED', workflowVersionId: draft.id };
};
