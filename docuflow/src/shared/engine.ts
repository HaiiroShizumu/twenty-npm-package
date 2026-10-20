// Who does the server-side work of docflow in this workspace. APP: the
// app's logic functions (any Twenty). FORK: the NorDiv fork server modules,
// which then must not be doubled by the app.
export type DocflowEngine = 'APP' | 'FORK';

export const getDocflowEngine = (
  value: string | undefined = process.env.DOCFLOW_ENGINE,
): DocflowEngine => (value === 'FORK' ? 'FORK' : 'APP');

export const isAppEngine = (value?: string): boolean =>
  getDocflowEngine(value) === 'APP';
