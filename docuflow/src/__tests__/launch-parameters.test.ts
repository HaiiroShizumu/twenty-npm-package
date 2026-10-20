import { describe, expect, it } from 'vitest';

import { type FormField } from 'src/shared/form/form-field.type';
import {
  applyBuilderFieldKind,
  buildFieldNameFromLabel,
  buildFieldsOutputSchema,
  buildUniqueFieldName,
  getBuilderFieldKind,
} from 'src/shared/form/form-field-builder.util';
import {
  buildLaunchParameters,
  buildLaunchPayload,
  findLaunchParametersStep,
} from 'src/shared/workflow/launch-step.util';

const contract: FormField = { id: 'f1', name: 'contract', label: 'Договор', type: 'TEXT' };
const manager: FormField = {
  id: 'f2',
  name: 'manager',
  label: 'Руководитель',
  type: 'RECORD',
  settings: { objectName: 'workspaceMember' },
};

describe('launch parameters', () => {
  it('names a field after its label in latin letters', () => {
    expect(buildFieldNameFromLabel('Сумма договора')).toBe('summaDogovora');
    expect(buildFieldNameFromLabel('2 подписи')).toBe('field2Podpisi');
    expect(buildUniqueFieldName('Сумма', ['summa', 'summa2'])).toBe('summa3');
  });

  it('switches a field between the builder kinds', () => {
    const company = applyBuilderFieldKind(manager, 'COMPANY');

    expect(company.settings).toEqual({ objectName: 'company' });
    expect(getBuilderFieldKind(company)).toBe('COMPANY');
    expect(getBuilderFieldKind(applyBuilderFieldKind(company, 'DATE'))).toBe('DATE');
  });

  it('sends every parameter, an empty one as null', () => {
    expect(
      buildLaunchParameters({ fields: [contract, manager], values: { contract: '', manager: { id: 'm' } } }),
    ).toEqual({ contract: null, manager: { id: 'm' } });
  });

  it('puts each parameter into the trigger output, and all of them for older launch steps', () => {
    expect(buildLaunchPayload({ contract: 'Д-7', manager: null })).toEqual({
      contract: 'Д-7',
      manager: null,
      smbDocflowParameters: { contract: 'Д-7', manager: null },
    });
  });

  it('describes the parameters as variables of the trigger', () => {
    expect(buildFieldsOutputSchema([contract, manager])).toEqual({
      contract: { isLeaf: true, type: 'string', label: 'Договор', value: null },
      manager: {
        isLeaf: false,
        type: 'object',
        label: 'Руководитель',
        value: { id: { isLeaf: true, type: 'string', label: 'Id', value: null } },
      },
    });
  });

  it('finds the launch step by the parameters it takes', () => {
    const launchStep = {
      id: 'launch',
      name: 'Запуск с параметрами',
      type: 'LOGIC_FUNCTION',
      settings: {
        input: {
          logicFunctionId: 'fn',
          logicFunctionInput: { parameters: '{{trigger.smbDocflowParameters}}' },
        },
      },
    };
    const codeStep = { ...launchStep, id: 'code', settings: { input: { logicFunctionInput: {} } } };

    expect(findLaunchParametersStep([codeStep, launchStep])?.id).toBe('launch');
    expect(findLaunchParametersStep([codeStep])).toBeUndefined();
  });
});
