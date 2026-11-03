import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

export interface NeonStatus {
  isConnected: boolean;
  databaseUrl: string;
  isConfigured: boolean;
  poolerHost?: string;
  databaseName?: string;
  latencyMs?: number;
  tablesCount?: number;
  error?: string;
}

export async function checkNeonConnection(): Promise<NeonStatus> {
  const url = process.env.DATABASE_URL || '';
  const isConfigured = Boolean(url && !url.includes('npg_sample_password') && !url.includes('YOUR_PASSWORD'));

  if (!isConfigured) {
    return {
      isConnected: false,
      databaseUrl: url ? maskDatabaseUrl(url) : 'Não configurado',
      isConfigured: false,
      error: 'URL do Neon no arquivo .env ainda contém credenciais de exemplo. Insira sua string de conexão real do Neon.',
    };
  }

  const startTime = Date.now();

  try {
    const pool = new Pool({ connectionString: url });
    const client = await pool.connect();
    
    // Testa consulta simples
    const res = await client.query('SELECT current_database() as db, count(*) as tables FROM information_schema.tables WHERE table_schema = $1', ['public']);
    client.release();
    await pool.end();

    const latencyMs = Date.now() - startTime;
    const dbName = res.rows[0]?.db || 'neondb';
    const tablesCount = parseInt(res.rows[0]?.tables || '0', 10);

    return {
      isConnected: true,
      databaseUrl: maskDatabaseUrl(url),
      isConfigured: true,
      databaseName: dbName,
      tablesCount,
      latencyMs,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isConnected: false,
      databaseUrl: maskDatabaseUrl(url),
      isConfigured: true,
      error: `Falha ao conectar no Neon: ${message}`,
    };
  }
}

export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username}:••••••••@${parsed.host}${parsed.pathname}`;
  } catch {
    return url.replace(/:([^:@]+)@/, ':••••••••@');
  }
}
