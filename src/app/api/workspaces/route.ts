import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const userId = searchParams.get('userId');

    const where = userId
      ? { members: { some: { userId } } }
      : {};

    const workspaces = await prisma.workspace.findMany({
      where,
      include: {
        accounts: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(workspaces);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao listar workspaces';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        type: body.type || 'CORPORATE',
        document: body.document,
        legalName: body.legalName,
        defaultCurrency: body.defaultCurrency || 'BRL',
        colorTheme: body.colorTheme || '#6366f1',
        ...(body.userId
          ? {
              members: {
                create: {
                  userId: body.userId,
                  role: 'OWNER',
                },
              },
            }
          : {}),
      },
    });
    return NextResponse.json(workspace);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar workspace';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
