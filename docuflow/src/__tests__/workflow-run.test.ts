import { describe, expect, it } from 'vitest';

import { getRunTargetRecord } from 'src/shared/workflow/run-target-record.util';
import { type WorkflowRunState } from 'src/shared/workflow/workflow-run.type';
import {
  getFormStepTaskRequests,
  resolveStepVariable,
} from 'src/shared/workflow/workflow-run.util';

const MANAGER_ID = '22222222-2222-4222-8222-222222222222';
const STARTER_ID = '55555555-5555-4555-8555-555555555555';
const DEAL_ID = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-10-15T10:00:00.000Z');

const parametersStep = {
  id: 'parameters',
  name: 'Параметры',
  type: 'FORM',
  settings: { input: [{ id: 'p1', name: 'manager', label: 'Руководитель', type: 'RECORD' }] },
};

const approveStep = {
  id: 'approve',
  name: 'Согласовать',
  type: 'FORM',
  settings: {
    input: [
      { id: 'f1', name: 'amount', label: 'Сумма', type: 'NUMBER', settings: { smbIsRequired: true } },
      {
        id: 'f2',
        name: 'assignee',
        label: 'Исполнитель',
        type: 'RECORD',
        value: '{{parameters.manager}}',
        settings: { smbRole: 'ASSIGNEE' },
      },
      { id: 'f3', name: 'due', label: 'Срок', type: 'DATE', settings: { smbRole: 'DUE_AT', smbDueInDays: 2 } },
    ],
  },
};

const buildState = (approveInfo: object): WorkflowRunState => ({
  flow: {
    trigger: { type: 'MANUAL', nextStepIds: ['parameters'] },
    steps: [parametersStep, approveStep],
  },
  stepInfos: {
    trigger: { status: 'SUCCESS', result: { smbDocflowParameters: { manager: { id: MANAGER_ID } } } },
    parameters: { status: 'SUCCESS', result: { manager: { id: MANAGER_ID } } },
    approve: approveInfo,
  },
});

describe('workflow run', () => {
  it('reads a variable from what an earlier step returned', () => {
    const { stepInfos } = buildState({});

    expect(resolveStepVariable('{{parameters.manager}}', stepInfos)).toEqual({ id: MANAGER_ID });
    expect(resolveStepVariable('{{parameters.missing.id}}', stepInfos)).toBeUndefined();
    expect(resolveStepVariable('Привет {{x}}', stepInfos)).toBe('Привет {{x}}');
  });

  it('hands a waiting step out to the assignee picked at launch', () => {
    const [request] = getFormStepTaskRequests({
      state: buildState({ status: 'PENDING', threadId: 'thread-1' }),
      runStarterWorkspaceMemberId: STARTER_ID,
      now: NOW,
    });

    expect(request).toMatchObject({
      stepId: 'approve',
      threadId: 'thread-1',
      assigneeWorkspaceMemberId: MANAGER_ID,
      dueAt: '2026-10-17T10:00:00.000Z',
    });
    expect(request.fields.map(({ name }) => name)).toEqual(['amount']);
  });

  it('gives an unassigned step of a manual run to the starter, even the first one', () => {
    const state: WorkflowRunState = {
      flow: { trigger: { type: 'MANUAL', nextStepIds: ['parameters'] }, steps: [parametersStep] },
      stepInfos: { parameters: { status: 'PENDING', threadId: 't' } },
    };

    expect(
      getFormStepTaskRequests({ state, runStarterWorkspaceMemberId: STARTER_ID, now: NOW }),
    ).toMatchObject([{ stepId: 'parameters', assigneeWorkspaceMemberId: STARTER_ID }]);
    expect(
      getFormStepTaskRequests({
        state: { ...state, flow: { ...state.flow, trigger: { type: 'CRON' } } },
        runStarterWorkspaceMemberId: STARTER_ID,
        now: NOW,
      }),
    ).toEqual([]);
  });

  it('skips a step that is answered or not opened yet', () => {
    for (const info of [{ status: 'SUCCESS', threadId: 't' }, { status: 'PENDING' }]) {
      expect(
        getFormStepTaskRequests({ state: buildState(info), runStarterWorkspaceMemberId: null, now: NOW }),
      ).toEqual([]);
    }
  });

  it('links a task of a deal event to that deal', () => {
    expect(
      getRunTargetRecord({
        flow: { trigger: { type: 'DATABASE_EVENT', settings: { eventName: 'opportunity.created' } } },
        stepInfos: { trigger: { result: { recordId: DEAL_ID } } },
      }),
    ).toEqual({ targetFieldName: 'targetOpportunityId', recordId: DEAL_ID });
  });
});
