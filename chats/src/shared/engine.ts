// Кто ведёт беседы компании. APP — функции и страницы приложения (любой
// Twenty). FORK — сервер и раздел «Чаты» форка NorDiv: приложение тогда только
// хранит данные, иначе в компании было бы два мессенджера.
export type MessengerEngine = 'APP' | 'FORK';

export const getMessengerEngine = (
  value: string | undefined = process.env.MESSENGER_ENGINE,
): MessengerEngine => (value === 'FORK' ? 'FORK' : 'APP');

export const isAppEngine = (value?: string): boolean =>
  getMessengerEngine(value) === 'APP';
