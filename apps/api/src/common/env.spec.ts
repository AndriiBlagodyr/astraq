import { parseEnv } from './env';

describe('env validation', () => {
  it('falls back to the local infra defaults outside production', () => {
    const result = parseEnv({});

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      PORT: 4000,
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://veracand:veracand@localhost:5432/veracand',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGINS: ['http://localhost:3000'],
      COMMIT_SHA: null,
    });
  });

  it("takes the commit from COMMIT_SHA, else Railway's variable", () => {
    expect(
      parseEnv({ RAILWAY_GIT_COMMIT_SHA: 'abc1234' }).data?.COMMIT_SHA,
    ).toBe('abc1234');
    expect(
      parseEnv({ COMMIT_SHA: 'def5678', RAILWAY_GIT_COMMIT_SHA: 'abc1234' })
        .data?.COMMIT_SHA,
    ).toBe('def5678');
  });

  it('splits CORS_ORIGINS into a trimmed list', () => {
    const result = parseEnv({
      CORS_ORIGINS: 'https://veracand.app, https://preview.veracand.app',
    });

    expect(result.data?.CORS_ORIGINS).toEqual([
      'https://veracand.app',
      'https://preview.veracand.app',
    ]);
  });

  it('rejects an origin with a path, and a non-postgres DATABASE_URL', () => {
    const result = parseEnv({
      CORS_ORIGINS: 'https://veracand.app/',
      DATABASE_URL: 'mysql://localhost/veracand',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['CORS_ORIGINS', 'DATABASE_URL']),
    );
  });

  it('requires the database URL and origins in production', () => {
    const result = parseEnv({ NODE_ENV: 'production' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      'CORS_ORIGINS',
      'DATABASE_URL',
    ]);
  });
});
