import { submitContactMessage } from '@/app/utils/contactApi';

const PAYLOAD = { email: 'test@example.com', message: 'Hello' };

describe('submitContactMessage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('posts to correct endpoint with JSON body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ id: 1, createdAt: '2026-04-19T10:00:00Z' }),
    } as Response);

    await submitContactMessage(PAYLOAD);

    expect(fetch).toHaveBeenCalledWith('/api/proxy/api/public/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PAYLOAD),
    });
  });

  it('returns ok:true with id and createdAt on 201', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ id: 42, createdAt: '2026-04-19T10:00:00Z' }),
    } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({ ok: true, id: 42, createdAt: '2026-04-19T10:00:00Z' });
  });

  it('returns rate-limit code on 429', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 429 } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      code: 'rate-limit',
      message:
        'Whoa — too many messages from your network in the last hour. Please try again later.',
    });
  });

  it('returns validation code with backend message on 400', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 400,
      json: async () => ({ message: 'Invalid email address' }),
    } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      code: 'validation',
      message: 'Invalid email address',
    });
  });

  it('returns validation code with fallback message when 400 has no message field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 400,
      json: async () => ({}),
    } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({ ok: false, code: 'validation', message: 'Invalid submission.' });
  });

  it('returns server code on 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 500 } as Response);

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      code: 'server',
      message: 'Something went wrong. Please try again in a bit.',
    });
  });

  it('returns network code when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const result = await submitContactMessage(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      code: 'network',
      message: "Couldn't reach the server. Please try again in a bit.",
    });
  });
});
