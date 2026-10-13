import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const where = workspaceId ? { workspaceId } : {};

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(accounts);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao listar contas';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const account = await prisma.account.create({
      data: {
        name: body.name,
        type: body.type,
        bankName: body.bankName,
        currency: body.currency || 'BRL',
        initialBalance: body.initialBalance || 0,
        currentBalance: body.currentBalance || body.initialBalance || 0,
        creditLimit: body.creditLimit,
        closingDay: body.closingDay,
        dueDay: body.dueDay,
        color: body.color || '#3b82f6',
        workspaceId: body.workspaceId,
      },
    });
    return NextResponse.json(account);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar conta';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
