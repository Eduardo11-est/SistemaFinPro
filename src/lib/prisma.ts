import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDirect: PrismaClient | undefined;
};

/**
 * Trata e normaliza a URL do banco Neon para compatibilidade máxima com Prisma e Render
 */
export function formatNeonUrl(raw?: string, useDirect = false): string {
  if (!raw) return '';
  let url = raw.trim();

  // Remove aspas acidentais inseridas nas variáveis de ambiente
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  try {
    const parsed = new URL(url);

    // Se solicitado endpoint direto ou fallback
    if (useDirect && parsed.hostname.includes('-pooler')) {
      parsed.hostname = parsed.hostname.replace('-pooler', '');
      parsed.searchParams.delete('pgbouncer');
    }

    parsed.searchParams.set('sslmode', 'require');
    parsed.searchParams.set('connect_timeout', '60');

    // Se for o endpoint do pooler Neon, o Prisma exige pgbouncer=true
    if (parsed.hostname.includes('-pooler')) {
      parsed.searchParams.set('pgbouncer', 'true');
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient(useDirect = false): PrismaClient {
  const url = formatNeonUrl(process.env.DATABASE_URL, useDirect);

  if (url) {
    return new PrismaClient({
      datasources: { db: { url } },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient(false);
export const prismaDirect = globalForPrisma.prismaDirect ?? createPrismaClient(true);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDirect = prismaDirect;
}

/**
 * Executa uma operação no banco com tolerância a cold start do Neon.
 * Se o Neon estiver hibernando, aguarda e tenta novamente de forma transparente.
 * Se a conexão via pooler falhar com P1001, chaveia automaticamente para a conexão direta.
 */
export async function withDatabaseRetry<T>(
  operation: (client: PrismaClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown;
  let clientToUse = prisma;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(clientToUse);
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isConnectionIssue =
        msg.includes("Can't reach database") ||
        msg.includes('P1001') ||
        msg.includes('connection timed out') ||
        msg.includes('Connection terminated') ||
        msg.includes('timed out');

      if (isConnectionIssue && attempt < maxRetries) {
        console.warn(`[Neon DB Retry] Tentativa ${attempt} falhou. Alternando cliente e aguardando...`);
        // Alterna para o cliente com conexão direta no retry
        clientToUse = clientToUse === prisma ? prismaDirect : prisma;
        await new Promise((res) => setTimeout(res, 2000));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

export async function ensureNeonAwake(): Promise<void> {
  // Mantido para compatibilidade com chamadas existentes
}
