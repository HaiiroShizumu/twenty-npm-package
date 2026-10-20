export type SkinBackground =
  | { kind: 'image'; url: string }
  | { kind: 'color'; color: string }
  | { kind: 'none' };
