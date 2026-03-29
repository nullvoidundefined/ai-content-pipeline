import { doubleCsrf } from 'csrf-csrf';
import type { Request } from 'express';

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  getSessionIdentifier: (req: Request) => req.cookies?.sid ?? '',
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  },
});

export { doubleCsrfProtection as csrfGuard, generateCsrfToken };
