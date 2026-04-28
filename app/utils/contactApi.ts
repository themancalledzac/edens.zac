export interface ContactPayload {
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; id: number; createdAt: string }
  | { ok: false; code: 'rate-limit' | 'validation' | 'server' | 'network'; message: string };

const SERVER_ERROR_MESSAGE = 'Something went wrong. Please try again in a bit.';
const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Please try again in a bit.";

const ENDPOINT = '/api/proxy/api/public/messages';

export async function submitContactMessage(payload: ContactPayload): Promise<ContactResult> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      const data = (await res.json()) as { id: number; createdAt: string };
      if (typeof data.id !== 'number' || typeof data.createdAt !== 'string') {
        return { ok: false, code: 'server', message: SERVER_ERROR_MESSAGE };
      }
      return { ok: true, id: data.id, createdAt: data.createdAt };
    }

    if (res.status === 429) {
      return {
        ok: false,
        code: 'rate-limit',
        message:
          'Whoa — too many messages from your network in the last hour. Please try again later.',
      };
    }

    if (res.status === 400) {
      const data = (await res.json()) as { message?: string };
      return {
        ok: false,
        code: 'validation',
        message: data.message ?? 'Invalid submission.',
      };
    }

    return {
      ok: false,
      code: 'server',
      message: SERVER_ERROR_MESSAGE,
    };
  } catch {
    return {
      ok: false,
      code: 'network',
      message: NETWORK_ERROR_MESSAGE,
    };
  }
}
