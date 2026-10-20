import { describe, expect, it } from 'vitest';

import { type FormField } from 'src/shared/form/form-field.type';
import {
  buildFormStepResponse,
  buildFormValues,
  findMissingRequiredFields,
  getFormFieldsError,
  isFormValueEmpty,
  parseFormFields,
} from 'src/shared/form/form-fields.util';

const amount: FormField = {
  id: 'f1',
  name: 'amount',
  label: 'Сумма',
  type: 'NUMBER',
  settings: { smbIsRequired: true },
};
const city: FormField = { id: 'f2', name: 'city', label: 'Город', type: 'TEXT', value: 'Пенза' };
const approver: FormField = {
  id: 'f3',
  name: 'approver',
  label: 'Согласует',
  type: 'RECORD',
  value: '{{trigger.workspaceMemberId}}',
  settings: { smbRole: 'ASSIGNEE', smbIsRequired: true },
};

describe('form fields', () => {
  it('treats blank text, empty lists and a record without id as empty', () => {
    expect(isFormValueEmpty('  ')).toBe(true);
    expect(isFormValueEmpty([])).toBe(true);
    expect(isFormValueEmpty({ id: '' })).toBe(true);
    expect(isFormValueEmpty(0)).toBe(false);
    expect(isFormValueEmpty({ id: 'x' })).toBe(false);
  });

  it('names empty required fields a person fills, never service fields', () => {
    expect(
      findMissingRequiredFields({ fields: [amount, city, approver], values: {} }).map(
        ({ name }) => name,
      ),
    ).toEqual(['amount']);
  });

  it('builds values from typed and preset values of fillable fields', () => {
    expect(buildFormValues({ fields: [amount, city, approver], values: { amount: 5 } })).toEqual({
      amount: 5,
      city: 'Пенза',
    });
  });

  it('answers a step with every field, service ones included', () => {
    expect(
      buildFormStepResponse({
        fields: [amount, { ...approver, value: { id: 'member-1' } }],
        values: { amount: 7 },
      }),
    ).toEqual({ amount: 7, approver: { id: 'member-1' } });
  });

  it('rejects repeated and malformed field names', () => {
    expect(getFormFieldsError([amount, amount])).toContain('повторяется');
    expect(getFormFieldsError([{ ...amount, name: '1st' }])).toContain('латинской');
    expect(getFormFieldsError([amount, city])).toBeUndefined();
  });

  it('keeps only well-formed fields from stored JSON', () => {
    expect(parseFormFields([amount, { name: 'x' }, null, 'text'])).toEqual([amount]);
    expect(parseFormFields({ fields: [] })).toEqual([]);
  });
});
