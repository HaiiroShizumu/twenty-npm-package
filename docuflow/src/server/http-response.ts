import { Response } from 'twenty-sdk/logic-function';

export const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const htmlResponse = (status: number, html: string) =>
  new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

export const redirectResponse = (location: string, status = 303) =>
  new Response(null, {
    status,
    headers: { location },
  });

export const readJsonBody = (body: unknown): Record<string, unknown> =>
  typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
