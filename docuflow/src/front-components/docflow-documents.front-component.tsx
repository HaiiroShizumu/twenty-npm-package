import { useEffect, useMemo, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, openSidePanelPage } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';

import { createRecord, deleteRecord, getErrorMessage, listRecords } from 'src/front/api';
import {
  DOCUMENT_TYPE_LABELS,
  formatDate,
} from 'src/front/format';
import { useAsync, useDebouncedValue } from 'src/front/hooks/use-async';
import { type DocflowDocument, type DocumentFolder } from 'src/front/types';
import {
  DataTable,
  DocflowRoot,
  Message,
  SelectField,
  TextField,
  Toolbar,
} from 'src/front/ui/components';
import { restAnd, restEq, restIlike, restIn, restIsNotNull, restOr } from 'src/shared/api/rest-filter.util';
import { DOCUMENT_OBJECT_NAME, PAGE_SIZE } from 'src/shared/docflow.constants';
import { logDocflow, logDocflowError } from 'src/shared/log.util';
import { DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const LIST_POLL_INTERVAL_MS = 3000;
const LIST_POLL_DURATION_MS = 10 * 60 * 1000;

type DocumentFilter = 'all' | 'collected' | 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED' | 'deleted';

const SEARCH_DEBOUNCE_MS = 300;
const FOLDERS_LIMIT = 500;
const ALL_FOLDERS = '';

// The sandbox of a front component gets only the name and size of a chosen
// file, never its content, so the file goes in through the standard "File"
// field of the document's own card, opened in the side panel.
const openDocumentCard = async (documentId: string) => {
  logDocflow('documents: open card to attach the file', { documentId });

  try {
    await openSidePanelPage({
      to: AppPath.RecordShowPage,
      params: { objectNameSingular: DOCUMENT_OBJECT_NAME, objectRecordId: documentId },
      pageTitle: 'Документ',
    });
  } catch (error) {
    logDocflowError('documents: side panel did not open', error, { documentId });
    await enqueueSnackbar({
      message: 'Карточка документа не открылась, попробуйте ещё раз',
      variant: 'error',
    });
  }
};

const buildFilter = ({
  folderId,
  documentFilter,
  searchQuery,
}: {
  folderId: string;
  documentFilter: DocumentFilter;
  searchQuery: string;
}) =>
  restAnd(
    folderId !== ALL_FOLDERS ? restEq('folderId', folderId) : undefined,
    // Deleted = in the Twenty trash, restored from the document's own card
    documentFilter === 'deleted'
      ? restIsNotNull('deletedAt')
      : documentFilter === 'collected'
      ? restIn('origin', ['RECORD', 'PROCESS'])
      : documentFilter !== 'all'
        ? restEq('status', documentFilter)
        : undefined,
    searchQuery.trim().length > 0
      ? restOr(
          restIlike('name', searchQuery),
          restIlike('number', searchQuery),
          restIlike('sourceRecordName', searchQuery),
        )
      : undefined,
  );

const DocflowDocuments = () => {
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [folderId, setFolderId] = useState(ALL_FOLDERS);
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>('all');
  const [openedDocumentId, setOpenedDocumentId] = useState<string | undefined>();
  const [watchStartedAt, setWatchStartedAt] = useState<number | undefined>();
  const [pages, setPages] = useState(1);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: folders, reload: reloadFolders } = useAsync(
    async () =>
      (
        await listRecords<DocumentFolder>('smbDocumentFolders', {
          order_by: 'name[AscNullsLast]',
          limit: FOLDERS_LIMIT,
        })
      ).records,
    [],
  );
  const listQuery = useMemo(
    () => ({
      filter: buildFilter({ folderId, documentFilter, searchQuery }),
      order_by: 'createdAt[DescNullsLast]',
      limit: PAGE_SIZE * pages,
      depth: 1,
    }),
    [folderId, documentFilter, searchQuery, pages],
  );
  const { data, setData, loading, error, reload } = useAsync(
    () => listRecords<DocflowDocument>('smbDocuments', listQuery),
    [listQuery],
  );
  const documents = data?.records ?? [];

  // A document opens in its standard card in the side panel; while people
  // edit there, the list re-reads itself quietly to show the changes.
  const openDocument = async (documentId: string) => {
    setOpenedDocumentId(documentId);
    setWatchStartedAt(Date.now());
    await openDocumentCard(documentId);
  };

  useEffect(() => {
    if (watchStartedAt === undefined) {
      return;
    }

    const interval = setInterval(() => {
      void listRecords<DocflowDocument>('smbDocuments', listQuery)
        .then((latest) => {
          const signature = (list: DocflowDocument[]) =>
            list.map(({ id, updatedAt }) => `${id}:${updatedAt ?? ''}`).join();

          if (signature(latest.records) !== signature(data?.records ?? [])) {
            setData(latest);
          }
        })
        .catch(() => undefined);
    }, LIST_POLL_INTERVAL_MS);
    const stop = setTimeout(() => clearInterval(interval), LIST_POLL_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [watchStartedAt, listQuery, data]);

  // As "Создать" of a standard list: an empty draft in the open folder, filled
  // in its own card in the side panel (the file goes in there too).
  const handleCreateDocument = async () => {
    setIsCreating(true);
    logDocflow('documents: create', { folderId });

    try {
      const document = await createRecord<DocflowDocument>('smbDocuments', {
        name: '',
        status: 'DRAFT',
        origin: 'UPLOAD',
        folderId: folderId === ALL_FOLDERS ? null : folderId,
      });

      if (document === undefined) {
        throw new Error('документ создан, но сервер его не вернул');
      }

      void reload();
      await openDocument(document.id);
    } catch (createError) {
      logDocflowError('documents: create failed', createError);
      await enqueueSnackbar({
        message: getErrorMessage(createError, 'Не удалось создать документ'),
        variant: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteRecord('smbDocuments', documentId);
      await enqueueSnackbar({ message: 'Документ удалён: он в фильтре «Удалённые»', variant: 'success' });
      await reload();
    } catch (deleteError) {
      logDocflowError('documents: delete failed', deleteError, { documentId });
      await enqueueSnackbar({ message: getErrorMessage(deleteError, 'Не удалось удалить документ'), variant: 'error' });
    }
  };

  const handleCreateFolder = async () => {
    const folderName = newFolderName.trim();

    if (folderName.length === 0) {
      return;
    }

    try {
      await createRecord('smbDocumentFolders', {
        name: folderName,
        parentFolderId: folderId === ALL_FOLDERS ? null : folderId,
      });
      setNewFolderName('');
      await reloadFolders();
    } catch (folderError) {
      await enqueueSnackbar({ message: getErrorMessage(folderError, 'Не удалось создать папку'), variant: 'error' });
    }
  };

  return (
    <DocflowRoot>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap', minHeight: 0 }}>
          <nav
            aria-label="Папки"
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flex: '1 1 200px',
              flexDirection: 'column',
              gap: theme.spacing[1],
              maxWidth: '240px',
              padding: `${theme.spacing[4]} ${theme.spacing[3]} ${theme.spacing[4]} ${theme.spacing[5]}`,
            }}
          >
            {[{ id: ALL_FOLDERS, name: 'Все документы' }, ...(folders ?? [])].map((folder) => (
              <Button
                key={folder.id}
                variant={folder.id === folderId ? 'solid' : 'ghost'}
                size="sm"
                fullWidth
                onClick={() => {
                  setFolderId(folder.id);
                  setPages(1);
                }}
              >
                {folder.name?.trim() || 'Без названия'}
              </Button>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1], marginTop: theme.spacing[3] }}>
              <TextField placeholder="Новая папка" value={newFolderName} onChange={setNewFolderName} />
              <Button variant="outline" size="sm" disabled={newFolderName.trim().length === 0} onClick={() => void handleCreateFolder()}>
                Создать папку
              </Button>
            </div>
          </nav>
          <div style={{ display: 'flex', flex: '999 1 420px', flexDirection: 'column', minWidth: 0 }}>
            <Toolbar>
              <div style={{ flex: '0 1 240px' }}>
                <TextField
                  type="search"
                  variant="bare"
                  placeholder="Название или номер"
                  value={searchInput}
                  onChange={setSearchInput}
                />
              </div>
              <SelectField<DocumentFilter>
                variant="bare"
                value={documentFilter}
                options={[
                  { value: 'all', label: 'Все документы' },
                  { value: 'collected', label: 'Из записей и процессов' },
                  { value: 'DRAFT', label: 'Черновики' },
                  { value: 'IN_REVIEW', label: 'На согласовании' },
                  { value: 'APPROVED', label: 'Согласованные' },
                  { value: 'ARCHIVED', label: 'В архиве' },
                  { value: 'deleted', label: 'Удалённые' },
                ]}
                onChange={(value) => {
                  setDocumentFilter(value);
                  setPages(1);
                }}
              />
              <div style={{ marginLeft: 'auto' }}>
                <Button variant="solid" size="sm" loading={isCreating} onClick={() => void handleCreateDocument()}>
                  Создать
                </Button>
              </div>
            </Toolbar>
            {error !== undefined && (
              <div style={{ padding: theme.spacing[4] }}>
                <Message tone="danger">{getErrorMessage(error, 'Не удалось загрузить документы')}</Message>
              </div>
            )}
            {loading && documents.length === 0 && <Message>Загрузка…</Message>}
            {!loading && error === undefined && documents.length === 0 && <Message>Документов нет.</Message>}
            {documents.length > 0 && (
              <DataTable
                columns={[
                  { key: 'name', label: 'Название', width: '30%' },
                  { key: 'type', label: 'Тип', width: '12%' },
                  { key: 'number', label: 'Номер', width: '10%' },
                  { key: 'source', label: 'Где загружен', width: '22%' },
                  { key: 'createdAt', label: 'Добавлен' },
                ]}
                selectedRowId={openedDocumentId}
                onRowClick={(documentId) => void openDocument(documentId)}
                onDeleteRow={documentFilter === 'deleted' ? undefined : handleDeleteDocument}
                rows={documents.map((document) => ({
                  id: document.id,
                  cells: {
                    name: document.name?.trim() || 'Без названия',
                    type: DOCUMENT_TYPE_LABELS[document.documentType ?? ''],
                    number: document.number,
                    source: document.sourceRecordName,
                    createdAt: formatDate(document.createdAt),
                  },
                }))}
              />
            )}
            {data?.pageInfo.hasNextPage === true && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing[3] }}>
                <Button variant="ghost" size="sm" loading={loading} onClick={() => setPages((current) => current + 1)}>
                  Показать ещё
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DocflowRoot>
  );
};

export default defineFrontComponent({
  universalIdentifier: DOCUMENTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'docflow-documents',
  description: 'Документы компании: загрузка и файлы со всех записей и процессов',
  component: DocflowDocuments,
});
