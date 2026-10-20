// One prefix for everything the app writes to the console: in the browser a
// front component logs from its worker into the page's console, on the
// server a function logs into its execution logs (`yarn app dev:function:logs`).
const PREFIX = '[docflow]';

const describeError = (error: unknown): unknown => {
  if (error instanceof Error) {
    const { status, body } = error as Error & { status?: unknown; body?: unknown };

    return { name: error.name, message: error.message, status, body };
  }

  return error;
};

export const logDocflow = (event: string, details?: unknown) =>
  console.info(PREFIX, event, details ?? '');

export const logDocflowError = (event: string, error: unknown, details?: unknown) =>
  console.error(PREFIX, event, describeError(error), details ?? '');
