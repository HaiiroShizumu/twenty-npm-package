export type MessageNumbering<TMessage> = {
  findLargestSeq: () => Promise<number>;
  // undefined — номер или эта отправка уже заняты другой вставкой.
  insertWithSeq: (seq: number) => Promise<TMessage | undefined>;
  findSameSend: () => Promise<TMessage | undefined>;
};

export type NumberedMessage<TMessage> =
  | { status: 'INSERTED'; message: TMessage; seq: number }
  | { status: 'ALREADY_SENT'; message: TMessage };

// Номер — следующий после наибольшего в беседе; уникальный «беседа:номер» не
// даёт двоим один номер, проигравший берёт следующий. Повтор той же отправки
// возвращает сохранённое сообщение.
export const insertWithNextSeq = async <TMessage>(
  numbering: MessageNumbering<TMessage>,
  maxAttempts: number,
): Promise<NumberedMessage<TMessage>> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seq = (await numbering.findLargestSeq()) + 1;
    const message = await numbering.insertWithSeq(seq);

    if (message !== undefined) {
      return { status: 'INSERTED', message, seq };
    }

    const sameSend = await numbering.findSameSend();

    if (sameSend !== undefined) {
      return { status: 'ALREADY_SENT', message: sameSend };
    }
  }

  throw new Error(
    'Не удалось присвоить номер сообщению: слишком много одновременных отправок',
  );
};
