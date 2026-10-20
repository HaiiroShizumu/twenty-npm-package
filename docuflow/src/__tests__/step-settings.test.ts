import { describe, expect, it } from 'vitest';

import { type FormField } from 'src/shared/form/form-field.type';
import { applyStepSettings, readStepSettings } from 'src/shared/form/step-settings.util';

const amount: FormField = { id: 'f1', name: 'amount', label: 'Сумма', type: 'NUMBER' };
const createId = () => 'new-id';

describe('step settings', () => {
  it('writes the assignee, the deadline and the required marks into the fields', () => {
    const fields = applyStepSettings({
      fields: [amount],
      settings: { assignee: 'member-1', dueInDays: 2, requiredFieldIds: ['f1'] },
      createId,
    });

    expect(readStepSettings(fields)).toEqual({
      assignee: 'member-1',
      dueInDays: 2,
      requiredFieldIds: ['f1'],
    });
    expect(fields.find(({ id }) => id === 'f1')?.settings).toEqual({ smbIsRequired: true });
  });

  it('removes the role fields and the required marks when cleared', () => {
    const configured = applyStepSettings({
      fields: [amount],
      settings: { assignee: 'member-1', dueInDays: 2, requiredFieldIds: ['f1'] },
      createId,
    });
    const cleared = applyStepSettings({
      fields: configured,
      settings: { assignee: null, dueInDays: null, requiredFieldIds: [] },
      createId,
    });

    expect(cleared).toEqual([{ ...amount, settings: {} }]);
  });
});
