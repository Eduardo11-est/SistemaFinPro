/**
 * Utilitários de Segurança: Sanitização de Inputs, Validação e Rate Limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Limita a quantidade de requisições por chave (IP / rota) em uma janela de tempo.
 */
export function checkRateLimit(
  key: string,
  maxRequests = 15,
  windowMs = 60_000
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  // Limpeza periódica de chaves expiradas para evitar crescimento de memória
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  const existing = rateLimitStore.get(key);
  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Extrai um identificador seguro do cliente a partir dos headers da Request.
 */
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'local-client';
}

/**
 * Sanitiza strings removendo tags HTML/scripts potencialmente maliciosos (XSS)
 * e caracteres de controle invisíveis, respeitando um tamanho máximo.
 */
export function sanitizeText(input: unknown, maxLength = 255): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Remove tags HTML
    .replace(/[\u0000-\u001F\u007F]/g, '') // Remove caracteres de controle
    .trim()
    .slice(0, maxLength);
}

/**
 * Valida se um valor numérico financeiro é finito, positivo e dentro de limites seguros.
 */
export function sanitizePositiveAmount(input: unknown, allowZero = false): number | null {
  const num = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(num)) return null;
  if (allowZero ? num < 0 : num <= 0) return null;
  if (num > 1_000_000_000_000) return null; // Evita overflow astronômico
  return Math.round(num * 100) / 100;
}

/**
 * Mascara mensagens de erro internas do banco para evitar vazamento de detalhes sensíveis.
 */
export function getSafeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
