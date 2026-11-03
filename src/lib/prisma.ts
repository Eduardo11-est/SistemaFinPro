import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  neonPool: Pool | undefined;
};

function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not set');

  let clean = raw.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }

  if (!clean.includes('connect_timeout')) {
    const sep = clean.includes('?') ? '&' : '?';
    clean = `${clean}${sep}connect_timeout=60`;
  }

  return clean;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: getDatabaseUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Acorda o Neon enviando um SELECT 1 via WebSocket (mais rápido que TCP).
 * Chamado uma vez antes da primeira query Prisma para eliminar cold-start.
 */
function getNeonPool(): Pool {
  if (!globalForPrisma.neonPool) {
    globalForPrisma.neonPool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return globalForPrisma.neonPool;
}

let wakeupPromise: Promise<void> | null = null;

export async function ensureNeonAwake(): Promise<void> {
  if (!wakeupPromise) {
    wakeupPromise = getNeonPool()
      .query('SELECT 1')
      .then(() => {})
      .catch(() => {});
  }
  return wakeupPromise;
}
