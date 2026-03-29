import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema } from './auth.js';

describe('registerSchema', () => {
  it('accepts valid registration', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'securepassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'securepassword',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({ password: 'securepassword' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = registerSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'bad',
      password: 'password',
    });
    expect(result.success).toBe(false);
  });
});
