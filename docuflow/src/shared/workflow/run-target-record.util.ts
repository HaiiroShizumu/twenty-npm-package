import { TRIGGER_STEP_ID } from 'src/shared/docflow.constants';
import { type WorkflowRunState } from 'src/shared/workflow/workflow-run.type';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Task targets Twenty creates for every installation; other objects have
// their own target fields only when they are set up for tasks.
const TARGET_FIELD_NAME_BY_OBJECT_NAME: Record<string, string> = {
  person: 'targetPersonId',
  company: 'targetCompanyId',
  opportunity: 'targetOpportunityId',
};

const readRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const readUuid = (value: unknown): string | undefined =>
  typeof value === 'string' && UUID_PATTERN.test(value) ? value : undefined;

// A run started by an event on a deal, or launched from a deal's page, gives
// its tasks to that deal, so the task shows in the deal's card.
export const getRunTargetRecord = (
  state: WorkflowRunState | null | undefined,
): { targetFieldName: string; recordId: string } | undefined => {
  const trigger = state?.flow?.trigger;
  const payload = readRecord(state?.stepInfos?.[TRIGGER_STEP_ID]?.result);

  if (trigger === undefined || trigger === null || payload === undefined) {
    return undefined;
  }

  const settings = readRecord(trigger.settings) ?? {};
  let objectNameSingular: string | undefined;
  let recordId: string | undefined;

  if (trigger.type === 'DATABASE_EVENT') {
    const eventName = settings.eventName;

    objectNameSingular =
      typeof eventName === 'string' ? eventName.split('.')[0] : undefined;
    recordId =
      readUuid(payload.recordId) ??
      readUuid(readRecord(readRecord(payload.properties)?.after)?.id);
  }

  if (trigger.type === 'MANUAL') {
    const availability = readRecord(settings.availability);

    objectNameSingular =
      availability?.type === 'SINGLE_RECORD' &&
      typeof availability.objectNameSingular === 'string'
        ? availability.objectNameSingular
        : typeof settings.objectType === 'string'
          ? settings.objectType
          : undefined;
    recordId = readUuid(readRecord(payload.record)?.id);
  }

  const targetFieldName =
    objectNameSingular !== undefined
      ? TARGET_FIELD_NAME_BY_OBJECT_NAME[objectNameSingular]
      : undefined;

  return targetFieldName !== undefined && recordId !== undefined
    ? { targetFieldName, recordId }
    : undefined;
};
