// Filters of the Twenty REST API: `and(field[eq]:'value',or(...))`. The
// parser counts brackets and quotes without escaping, so text a person types
// loses those characters before it becomes part of a filter.
const UNSAFE_FILTER_CHARACTERS = /[()[\]'",]/g;

export const sanitizeFilterText = (text: string): string =>
  text.replace(UNSAFE_FILTER_CHARACTERS, ' ').trim();

const quote = (value: string): string => `'${sanitizeFilterText(value)}'`;

export const restEq = (field: string, value: string): string =>
  `${field}[eq]:${quote(value)}`;

export const restNeq = (field: string, value: string): string =>
  `${field}[neq]:${quote(value)}`;

export const restIsNull = (field: string): string => `${field}[is]:NULL`;

export const restLt = (field: string, value: string): string =>
  `${field}[lt]:${quote(value)}`;

export const restIn = (field: string, values: string[]): string =>
  `${field}[in]:[${values.map((value) => `"${sanitizeFilterText(value)}"`).join(',')}]`;

export const restIlike = (field: string, text: string): string =>
  `${field}[ilike]:'%${sanitizeFilterText(text)}%'`;

export const restAnd = (
  ...conditions: (string | undefined)[]
): string | undefined => {
  const present = conditions.filter(
    (condition): condition is string => condition !== undefined,
  );

  return present.length === 0 ? undefined : `and(${present.join(',')})`;
};

export const restOr = (...conditions: string[]): string =>
  `or(${conditions.join(',')})`;

export const restNumberLt = (field: string, value: number): string =>
  `${field}[lt]:${Math.trunc(value)}`;

export const restNumberGt = (field: string, value: number): string =>
  `${field}[gt]:${Math.trunc(value)}`;
