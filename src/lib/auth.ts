import crypto from 'crypto';
import { NextResponse } from 'next/server';

const SECRET = process.env.AUTH_SECRET || 'finpro_secret_key_salt_2026_v2_hardened';
const LEGACY_SALT = process.env.AUTH_SECRET || 'finpro_secret_key_salt_2026';
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';
export const SESSION_COOKIE_NAME = 'finpro_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Gera hash seguro usando PBKDF2-SHA512 com salt aleatório por senha.
 * Formato armazenado: pbkdf2$100000$<salt_hex>$<hash_hex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derivedKey}`;
}

/**
 * Verifica senha de forma resistente a ataques de tempo (timing-safe).
 * Suporta tanto o formato novo (PBKDF2-SHA512) quanto hashes legados (HMAC-SHA256).
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (storedHash.startsWith('pbkdf2$')) {
      const parts = storedHash.split('$');
      if (parts.length !== 4) return false;
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const originalHash = parts[3];

      if (!iterations || !salt || !originalHash) return false;

      const candidateHash = crypto
        .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
        .toString('hex');

      const a = Buffer.from(candidateHash, 'hex');
      const b = Buffer.from(originalHash, 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    }

    // Compatibilidade retroativa com hash legado HMAC-SHA256
    const legacyHash = crypto.createHmac('sha256', LEGACY_SALT).update(password).digest('hex');
    const a = Buffer.from(legacyHash, 'utf8');
    const b = Buffer.from(storedHash, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

/**
 * Cria um token de sessão assinado com HMAC-SHA256.
 */
export function createSessionToken(userId: string, email: string): string {
  const payload: SessionPayload = {
    userId,
    email,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const base64Payload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${signature}`;
}

/**
 * Valida a assinatura e a expiração do token de sessão.
 */
export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(base64Payload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(base64Payload, 'base64url').toString('utf8')
    ) as SessionPayload;

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Anexa o cookie HttpOnly de sessão na resposta NextResponse.
 */
export function attachSessionCookie(res: NextResponse, userId: string, email: string): void {
  const token = createSessionToken(userId, email);
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/**
 * Remove o cookie HttpOnly de sessão.
 */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
