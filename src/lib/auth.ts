import crypto from 'crypto';

const SALT = process.env.AUTH_SECRET || 'finpro_secret_key_salt_2026';

export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', SALT).update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
