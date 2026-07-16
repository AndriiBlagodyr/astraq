describe('env validation', () => {
  it('exports a valid env object with defaults', async () => {
    const { env } = await import('./env');

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBeDefined();
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
  });
});
