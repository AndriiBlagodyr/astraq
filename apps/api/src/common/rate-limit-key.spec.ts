import {
  BFF_SECRET_HEADER,
  CLIENT_IP_HEADER,
  rateLimitKey,
} from './rate-limit-key';

const SECRET = 'a-shared-secret-of-at-least-32-bytes';

function request(headers: Record<string, string>) {
  return { ip: '10.0.0.1', headers };
}

describe('rateLimitKey', () => {
  it("uses the browser's address when the BFF vouches for it", () => {
    expect(
      rateLimitKey(
        request({ [BFF_SECRET_HEADER]: SECRET, [CLIENT_IP_HEADER]: '203.0.113.7' }),
        SECRET,
      ),
    ).toBe('203.0.113.7');
  });

  it('ignores the header without the secret, or with a wrong one', () => {
    expect(rateLimitKey(request({ [CLIENT_IP_HEADER]: '203.0.113.7' }), SECRET)).toBe(
      '10.0.0.1',
    );
    expect(
      rateLimitKey(
        request({ [BFF_SECRET_HEADER]: 'guess', [CLIENT_IP_HEADER]: '203.0.113.7' }),
        SECRET,
      ),
    ).toBe('10.0.0.1');
  });

  it('ignores a value that is not an address', () => {
    expect(
      rateLimitKey(
        request({ [BFF_SECRET_HEADER]: SECRET, [CLIENT_IP_HEADER]: 'anything-i-like' }),
        SECRET,
      ),
    ).toBe('10.0.0.1');
  });

  it("keeps the request's own address when no secret is configured", () => {
    expect(
      rateLimitKey(
        request({ [BFF_SECRET_HEADER]: SECRET, [CLIENT_IP_HEADER]: '203.0.113.7' }),
        null,
      ),
    ).toBe('10.0.0.1');
  });
});
