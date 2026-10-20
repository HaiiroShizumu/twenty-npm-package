import { type WorkspaceMember } from 'src/front/types';

export const formatMemberName = (member: WorkspaceMember | undefined): string =>
  [member?.name?.firstName, member?.name?.lastName]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');

export const formatDate = (value: string | null | undefined): string => {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ru-RU');
};

export const isOverdue = (
  dueAt: string | null | undefined,
  status: string | null | undefined,
  now: Date,
): boolean => {
  if (typeof dueAt !== 'string' || status === 'DONE') {
    return false;
  }

  const dueTime = new Date(dueAt).getTime();

  return Number.isFinite(dueTime) && dueTime < now.getTime();
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CONTRACT: 'Договор',
  INVOICE: 'Счёт',
  ACT: 'Акт',
  WAYBILL: 'Накладная',
  ORDER: 'Приказ',
  LETTER: 'Письмо',
  REPORT: 'Отчёт',
  OTHER: 'Прочее',
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На согласовании',
  APPROVED: 'Согласован',
  ARCHIVED: 'В архиве',
};

export const DOCUMENT_ORIGIN_LABELS: Record<string, string> = {
  UPLOAD: 'Загружен в документы',
  RECORD: 'Файл записи',
  PROCESS: 'Процесс',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнено',
};
