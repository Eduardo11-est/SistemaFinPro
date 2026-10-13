import { NextResponse } from 'next/server';
import { checkNeonConnection } from '@/lib/neon';

export async function GET() {
  try {
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
