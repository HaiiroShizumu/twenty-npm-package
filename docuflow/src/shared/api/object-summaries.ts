import { MetadataApiClient } from 'twenty-client-sdk/metadata';

export type ObjectSummary = {
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  labelFieldName?: string;
};

const OBJECTS_PAGE_SIZE = 100;

// Names and label fields of the workspace objects, read once per run. The
// metadata API cannot filter by name, so it is paged through.
export const getObjectSummaries = async (): Promise<Map<string, ObjectSummary>> => {
  const client = new MetadataApiClient();
  const summaries = new Map<string, ObjectSummary>();
  let after: string | undefined;

  do {
    const { objects } = await client.query({
      objects: {
        __args: {
          paging: { first: OBJECTS_PAGE_SIZE, ...(after !== undefined ? { after } : {}) },
          filter: {},
        },
        pageInfo: { hasNextPage: true, endCursor: true },
        edges: {
          node: {
            nameSingular: true,
            namePlural: true,
            labelSingular: true,
            labelIdentifierFieldMetadataId: true,
            fieldsList: { id: true, name: true },
          },
        },
      },
    });

    for (const { node } of objects.edges) {
      summaries.set(node.nameSingular, {
        nameSingular: node.nameSingular,
        namePlural: node.namePlural,
        labelSingular: node.labelSingular,
        labelFieldName: node.fieldsList?.find(
          (field) => field.id === node.labelIdentifierFieldMetadataId,
        )?.name,
      });
    }

    after =
      objects.pageInfo.hasNextPage === true
        ? (objects.pageInfo.endCursor ?? undefined)
        : undefined;
  } while (after !== undefined);

  return summaries;
};

export type SelectOption = { value: string; label: string };

// A SELECT field of a form takes its options from a field of an object
// (settings.selectedFieldId), like the standard form step does.
export const getFieldOptions = async (fieldId: string): Promise<SelectOption[]> => {
  const { fields } = await new MetadataApiClient().query({
    fields: {
      __args: { filter: { id: { eq: fieldId } }, paging: { first: 1 } },
      edges: { node: { options: true } },
    },
  });
  const options = fields.edges[0]?.node.options;

  return Array.isArray(options)
    ? options.flatMap((option: unknown) => {
        const { value, label } = (option ?? {}) as Record<string, unknown>;

        return typeof value === 'string' && typeof label === 'string' ? [{ value, label }] : [];
      })
    : [];
};
