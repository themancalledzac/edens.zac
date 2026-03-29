describe('environment utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadModule(): {
    isLocalEnvironment: () => boolean;
    isProduction: () => boolean;
  } {
    return require('@/app/utils/environment') as {
      isLocalEnvironment: () => boolean;
      isProduction: () => boolean;
    };
  }

  describe('isLocalEnvironment', () => {
    it('returns true when NEXT_PUBLIC_ENV=local', () => {
      process.env.NEXT_PUBLIC_ENV = 'local';
      delete process.env.NODE_ENV;
      const { isLocalEnvironment } = loadModule();
      expect(isLocalEnvironment()).toBe(true);
    });

    it('returns true when NODE_ENV=development', () => {
      delete process.env.NEXT_PUBLIC_ENV;
      process.env.NODE_ENV = 'development';
      const { isLocalEnvironment } = loadModule();
      expect(isLocalEnvironment()).toBe(true);
    });

    it('returns true when both NEXT_PUBLIC_ENV=local and NODE_ENV=development', () => {
      process.env.NEXT_PUBLIC_ENV = 'local';
      process.env.NODE_ENV = 'development';
      const { isLocalEnvironment } = loadModule();
      expect(isLocalEnvironment()).toBe(true);
    });

    it('returns false when NEXT_PUBLIC_ENV=production and NODE_ENV=production', () => {
      process.env.NEXT_PUBLIC_ENV = 'production';
      process.env.NODE_ENV = 'production';
      const { isLocalEnvironment } = loadModule();
      expect(isLocalEnvironment()).toBe(false);
    });

    it('returns false when both NEXT_PUBLIC_ENV and NODE_ENV are undefined', () => {
      delete process.env.NEXT_PUBLIC_ENV;
      delete process.env.NODE_ENV;
      const { isLocalEnvironment } = loadModule();
      expect(isLocalEnvironment()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('returns true when NEXT_PUBLIC_ENV=production regardless of NODE_ENV', () => {
      process.env.NEXT_PUBLIC_ENV = 'production';
      delete process.env.NODE_ENV;
      const { isProduction } = loadModule();
      expect(isProduction()).toBe(true);
    });

    it('returns true when NODE_ENV=production and not in local environment', () => {
      delete process.env.NEXT_PUBLIC_ENV;
      process.env.NODE_ENV = 'production';
      const { isProduction } = loadModule();
      expect(isProduction()).toBe(true);
    });

    it('returns false in local environment (NEXT_PUBLIC_ENV=local)', () => {
      process.env.NEXT_PUBLIC_ENV = 'local';
      process.env.NODE_ENV = 'production';
      const { isProduction } = loadModule();
      expect(isProduction()).toBe(false);
    });

    it('returns false when both NEXT_PUBLIC_ENV and NODE_ENV are undefined', () => {
      delete process.env.NEXT_PUBLIC_ENV;
      delete process.env.NODE_ENV;
      const { isProduction } = loadModule();
      expect(isProduction()).toBe(false);
    });
  });
});
