import { isLocalEnvironment } from '@/app/utils/environment';

describe('environment utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isLocalEnvironment', () => {
    it('returns true when NEXT_PUBLIC_ENV=local', () => {
      process.env.NEXT_PUBLIC_ENV = 'local';
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
      expect(isLocalEnvironment()).toBe(true);
    });

    it('returns true when NODE_ENV=development', () => {
      delete process.env.NEXT_PUBLIC_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      expect(isLocalEnvironment()).toBe(true);
    });

    it('returns true when both NEXT_PUBLIC_ENV=local and NODE_ENV=development', () => {
      process.env.NEXT_PUBLIC_ENV = 'local';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      expect(isLocalEnvironment()).toBe(true);
    });

    it('returns false when NEXT_PUBLIC_ENV=production and NODE_ENV=production', () => {
      process.env.NEXT_PUBLIC_ENV = 'production';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      expect(isLocalEnvironment()).toBe(false);
    });

    it('returns false when both NEXT_PUBLIC_ENV and NODE_ENV are undefined', () => {
      delete process.env.NEXT_PUBLIC_ENV;
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
      expect(isLocalEnvironment()).toBe(false);
    });
  });
});
