import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const workspaces = await prisma.workspace.findMany({
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
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        type: body.type || 'CORPORATE',
        document: body.document,
        legalName: body.legalName,
        defaultCurrency: body.defaultCurrency || 'BRL',
        colorTheme: body.colorTheme || '#6366f1',
      },
    });
    return NextResponse.json(workspace);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar workspace';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
