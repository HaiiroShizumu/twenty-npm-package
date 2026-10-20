// Классы попадают на страницу без изоляции, поэтому у всех префикс. Запросы
// контейнера идут от ширины виджета, а не окна.
export const MESSENGER_STYLE_SHEET = `
.nd-messenger { container-type: inline-size; display: flex; flex-direction: column; height: 100%; min-height: 0; font-family: inherit; }
.nd-messenger-split { display: flex; flex: 1; min-height: 0; }
.nd-messenger-list { display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto; width: 300px; }
.nd-messenger-list button.nd-messenger-item { background: transparent; border: 0; color: inherit; cursor: pointer; display: flex; flex-direction: column; font: inherit; gap: 2px; padding: 10px 16px; text-align: left; width: 100%; }
.nd-messenger-conversation { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.nd-messenger-feed { display: flex; flex: 1; flex-direction: column; gap: 8px; min-height: 0; overflow-y: auto; padding: 12px 16px; }
.nd-messenger-bubble { border-radius: 8px; max-width: 75%; padding: 6px 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
.nd-messenger-composer { display: flex; gap: 8px; padding: 8px 16px 12px; }
.nd-messenger-composer textarea { flex: 1; font: inherit; min-height: 36px; resize: vertical; }
.nd-messenger-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@container (max-width: 640px) {
  .nd-messenger-list { width: 100%; }
  .nd-messenger-split[data-open='true'] .nd-messenger-list { display: none; }
  .nd-messenger-split[data-open='false'] .nd-messenger-conversation { display: none; }
}
`;
