import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function cleanDatabaseUrl(raw?: string): string | undefined {
  if (!raw) return raw;
  let clean = raw.trim();
  // Remove aspas adicionadas por engano no painel de variáveis de ambiente
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function createPrismaClient(): PrismaClient {
  const rawUrl = cleanDatabaseUrl(process.env.DATABASE_URL);

  if (rawUrl) {
    let finalUrl = rawUrl;
    // Garante connect_timeout=60 para aguardar o despertar (cold start) do Neon Serverless
    if (!finalUrl.includes('connect_timeout')) {
      const sep = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${sep}connect_timeout=60`;
    }

    return new PrismaClient({
      datasources: {
        db: {
          url: finalUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
