import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function cleanDatabaseUrl(raw?: string): string {
  if (!raw) return '';
  let clean = raw.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function createPrismaClient(): PrismaClient {
  const connectionString = cleanDatabaseUrl(process.env.DATABASE_URL);

  if (!connectionString) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  // Usa o driver HTTP nativo da Neon (porta 443 via HTTPS).
  // Elimina completamente problemas de TCP 5432, timeouts e PgBouncer no Render.
  const adapter = new PrismaNeonHTTP(connectionString, {});

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function withDatabaseRetry<T>(
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  return await operation(prisma);
}

export async function ensureNeonAwake(): Promise<void> {
  // Com o adapter HTTP nativo, conexões são instantâneas via HTTPS
}
