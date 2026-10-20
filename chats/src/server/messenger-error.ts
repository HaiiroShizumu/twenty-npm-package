// Ошибка с ответом для человека: функция-маршрут отдаёт её статусом и текстом.
export class MessengerError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = () => new MessengerError(404, 'Беседа не найдена');
