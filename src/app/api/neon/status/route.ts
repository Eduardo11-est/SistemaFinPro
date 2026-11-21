import { NextResponse } from 'next/server';
import { checkNeonConnection } from '@/lib/neon';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await ensureNeonAwake();
    const isAdmin = await verifyAdminRequest(req, prisma);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso restrito a contas de Administrador.' },
        { status: 403 }
      );
    }

    const status = await checkNeonConnection();
    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json(
      { isConnected: false, error: message },
      { status: 500 }
    );
  }
}
