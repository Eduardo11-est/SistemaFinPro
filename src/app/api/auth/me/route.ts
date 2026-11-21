import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import { isAdminEmail, resolveRequestUserId } from '@/lib/auth';
import { sanitizeText } from '@/lib/security';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const userId = resolveRequestUserId(req, sanitizeText(searchParams.get('userId'), 100));

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        isAdmin: isAdminEmail(user.email),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao validar sessão' }, { status: 500 });
  }
}
