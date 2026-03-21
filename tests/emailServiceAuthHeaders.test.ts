import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('sendEmail auth headers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete process.env.APPLICATION_EMAIL_ENDPOINT;
    delete process.env.APPLICATION_EMAIL_API_KEY;
  });

  it('uses Supabase Authorization header even when EMAIL_API_KEY is set', async () => {
    const { SUPABASE_KEY, SUPABASE_URL } = await import('../services/supabaseClient');

    const baseUrl = SUPABASE_URL.endsWith('/') ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
    process.env.APPLICATION_EMAIL_ENDPOINT = `${baseUrl}/functions/v1/resend`;
    process.env.APPLICATION_EMAIL_API_KEY = 'NOT_A_JWT';

    vi.doMock('../services/supabaseClient', async () => {
      const actual = await vi.importActual<any>('../services/supabaseClient');
      return {
        ...actual,
        getSupabase: () => ({ functions: { invoke: vi.fn() } }),
        getSupabaseFunctionHeaders: async () => ({ Authorization: `Bearer ${SUPABASE_KEY}` }),
      };
    });

    const fetchSpy = vi.spyOn(globalThis as any, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'id', sentAt: new Date().toISOString() }),
    } as Response);

    const { sendEmail } = await import('../services/emailService');

    await sendEmail({ to: ['test@example.com'], subject: 'subj', body: 'body' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/functions/v1/resend',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  }, 20000);
});
