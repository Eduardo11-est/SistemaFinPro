import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const workspaceId = searchParams.get('workspaceId');
    const where = workspaceId ? { workspaceId } : {};

    const items = await prisma.payableReceivable.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao listar títulos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();
    const item = await prisma.payableReceivable.create({
      data: {
        type: body.type,
        description: body.description,
        amount: body.amount,
        dueDate: new Date(body.dueDate),
        status: body.status || 'PENDING',
        recipientOrPayer: body.recipientOrPayer,
        penaltyRate: body.penaltyRate || 0,
        interestRateDaily: body.interestRateDaily || 0,
        accruedInterest: body.accruedInterest || 0,
        workspaceId: body.workspaceId,
        accountId: body.accountId,
        categoryId: body.categoryId,
      },
    });
    return NextResponse.json(item);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar título';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, paymentDate, finalAmount, accountId } = body;
    await ensureNeonAwake();

    const updated = await prisma.payableReceivable.update({
      where: { id },
      data: {
        status,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        finalAmount,
        accountId,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar título';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
