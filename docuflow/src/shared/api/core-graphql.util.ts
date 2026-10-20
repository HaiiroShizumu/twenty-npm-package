// Mutations of the workflow engine (run a version, answer a form step) live
// in the core GraphQL schema, outside the generated record client, so they
// are sent as plain requests with the token Twenty gives the app.
type CoreGraphqlResponse<TData> = {
  data?: TData;
  errors?: { message?: string; extensions?: { userFriendlyMessage?: unknown } }[];
};

export class CoreGraphqlError extends Error {
  constructor(
    message: string,
    readonly userMessage: string | undefined,
  ) {
    super(message);
    this.name = 'CoreGraphqlError';
  }
}

const readUserMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = (value as { message: unknown }).message;

    return typeof message === 'string' ? message : undefined;
  }

  return undefined;
};

export const callCoreGraphql = async <TData>({
  query,
  variables,
}: {
  query: string;
  variables: Record<string, unknown>;
}): Promise<TData> => {
  const apiUrl = process.env.TWENTY_API_URL;
  const token = process.env.TWENTY_APP_ACCESS_TOKEN;

  if (apiUrl === undefined || token === undefined) {
    throw new CoreGraphqlError(
      'TWENTY_API_URL or TWENTY_APP_ACCESS_TOKEN is not set',
      undefined,
    );
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json()) as CoreGraphqlResponse<TData>;
  const [firstError] = body.errors ?? [];

  if (firstError !== undefined || body.data === undefined) {
    throw new CoreGraphqlError(
      firstError?.message ?? `GraphQL request failed with ${response.status}`,
      readUserMessage(firstError?.extensions?.userFriendlyMessage),
    );
  }

  return body.data;
};

export const RUN_WORKFLOW_VERSION_MUTATION = `mutation RunWorkflowVersion($input: RunWorkflowVersionInput!) {
  runWorkflowVersion(input: $input) { workflowRunId }
}`;

export const ANSWER_TOOL_CALL_MUTATION = `mutation AnswerToolCall($input: AnswerToolCallInput!) {
  answerToolCall(input: $input) { streamId }
}`;

export const UPDATE_WORKFLOW_VERSION_STEP_MUTATION = `mutation UpdateWorkflowVersionStep($input: UpdateWorkflowVersionStepInput!) {
  updateWorkflowVersionStep(input: $input) { id }
}`;

export const CREATE_WORKFLOW_VERSION_STEP_MUTATION = `mutation CreateWorkflowVersionStep($input: CreateWorkflowVersionStepInput!) {
  createWorkflowVersionStep(input: $input) { __typename }
}`;

export const DELETE_WORKFLOW_VERSION_STEP_MUTATION = `mutation DeleteWorkflowVersionStep($input: DeleteWorkflowVersionStepInput!) {
  deleteWorkflowVersionStep(input: $input) { __typename }
}`;

export const UPDATE_WORKFLOW_VERSION_TRIGGER_MUTATION = `mutation UpdateWorkflowVersionTrigger($input: UpdateWorkflowVersionTriggerInput!) {
  updateWorkflowVersionTrigger(input: $input) { __typename }
}`;

export const CREATE_DRAFT_FROM_WORKFLOW_VERSION_MUTATION = `mutation CreateDraftFromWorkflowVersion($input: CreateDraftFromWorkflowVersionInput!) {
  createDraftFromWorkflowVersion(input: $input) { id }
}`;
