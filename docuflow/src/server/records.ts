import { RestApiClient } from 'twenty-client-sdk/rest';

import { restAnd, restEq, restNeq, restIsNull, restOr } from 'src/shared/api/rest-filter.util';
import { readRestList, readRestRecord } from 'src/shared/api/rest-response.util';
import { TASK_DONE_STATUS } from 'src/shared/docflow.constants';
import {
  type WorkflowRunState,
  type WorkflowStep,
  type WorkflowTrigger,
} from 'src/shared/workflow/workflow-run.type';

// Every record the server functions read or write goes through here, over
// the REST API: it is the most stable public surface of Twenty, so a new core
// version changes at most this file.
export type RunAs = 'person' | 'application';

const clients: Record<RunAs, RestApiClient> = {
  person: new RestApiClient(),
  application: new RestApiClient({ runAs: 'application' }),
};

export const restClient = (runAs: RunAs): RestApiClient => clients[runAs];

export type DocflowTaskRecord = {
  id: string;
  title?: string | null;
  status?: string | null;
  assigneeId?: string | null;
  smbSection?: string | null;
  smbFormSchema?: unknown;
  smbFormValues?: unknown;
  smbWorkflowRunId?: string | null;
  smbWorkflowStepId?: string | null;
  smbWorkflowThreadId?: string | null;
};

export type WorkflowRunRecord = {
  id: string;
  name?: string | null;
  status?: string | null;
  workflowId?: string | null;
  state?: WorkflowRunState | null;
  createdBy?: { workspaceMemberId?: string | null } | null;
};

export type WorkflowRecord = {
  id: string;
  smbSection?: string | null;
  smbLaunchFields?: unknown;
};

export type WorkflowVersionRecord = {
  id: string;
  status?: string | null;
  workflowId?: string | null;
  trigger?: WorkflowTrigger | null;
  steps?: WorkflowStep[] | null;
};

export const getTask = async (runAs: RunAs, taskId: string) =>
  readRestRecord<DocflowTaskRecord>(
    await restClient(runAs).get(`/rest/tasks/${taskId}`),
  );

export const updateTask = async (
  runAs: RunAs,
  taskId: string,
  data: Partial<Omit<DocflowTaskRecord, 'id'>> & Record<string, unknown>,
) =>
  readRestRecord<DocflowTaskRecord>(
    await restClient(runAs).patch(`/rest/tasks/${taskId}`, data),
  );

export const createTask = async (
  runAs: RunAs,
  data: Record<string, unknown>,
) =>
  readRestRecord<DocflowTaskRecord>(
    await restClient(runAs).post('/rest/tasks', data),
  );

export const findTaskByThreadId = async (threadId: string) =>
  readRestList<DocflowTaskRecord>(
    await restClient('application').get('/rest/tasks', {
      query: { filter: restEq('smbWorkflowThreadId', threadId), limit: 1 },
    }),
  ).records[0];

export const findOpenTasksOfRun = async (workflowRunId: string) =>
  readRestList<DocflowTaskRecord>(
    await restClient('application').get('/rest/tasks', {
      query: {
        filter: restAnd(
          restEq('smbWorkflowRunId', workflowRunId),
          restOr(restNeq('status', TASK_DONE_STATUS), restIsNull('status')),
        ),
        limit: 200,
      },
    }),
  ).records;

export const getWorkflowRun = async (runAs: RunAs, workflowRunId: string) =>
  readRestRecord<WorkflowRunRecord>(
    await restClient(runAs).get(`/rest/workflowRuns/${workflowRunId}`),
  );

export const getWorkflow = async (runAs: RunAs, workflowId: string) =>
  readRestRecord<WorkflowRecord>(
    await restClient(runAs).get(`/rest/workflows/${workflowId}`),
  );

export const getWorkflowVersion = async (
  runAs: RunAs,
  workflowVersionId: string,
) =>
  readRestRecord<WorkflowVersionRecord>(
    await restClient(runAs).get(`/rest/workflowVersions/${workflowVersionId}`),
  );

export const listWorkflowVersions = async (runAs: RunAs, workflowId: string) =>
  readRestList<WorkflowVersionRecord>(
    await restClient(runAs).get('/rest/workflowVersions', {
      query: {
        filter: restEq('workflowId', workflowId),
        order_by: 'createdAt[DescNullsLast]',
        limit: 50,
      },
    }),
  ).records;

export const createTaskTarget = async (data: Record<string, unknown>) =>
  restClient('application').post('/rest/taskTargets', data);
