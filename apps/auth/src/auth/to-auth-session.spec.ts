import { toAuthSession } from './to-auth-session';

describe('toAuthSession', () => {
  it('keeps public user fields and drops session secrets', () => {
    const result = toAuthSession({
      user: {
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.com',
        emailVerified: false,
        image: undefined,
      },
      session: Object.assign(
        { id: 's1', userId: 'u1', expiresAt: new Date('2026-12-01T00:00:00Z') },
        { token: 'secret-token', ipAddress: '10.0.0.1' },
      ),
    });

    expect(result).toEqual({
      user: { id: 'u1', name: 'Ada', email: 'ada@example.com', emailVerified: false, image: null },
      session: { id: 's1', userId: 'u1', expiresAt: '2026-12-01T00:00:00.000Z' },
    });
    expect(JSON.stringify(result)).not.toContain('secret-token');
  });
});
