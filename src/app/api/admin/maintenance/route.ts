import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/auth';
import { sanitizeText, getSafeErrorMessage } from '@/lib/security';
import {
  MAINTENANCE_AUDIT_ACTION,
  MAINTENANCE_AUDIT_ENTITY,
  sanitizeMaintenanceConfig,
} from '@/lib/maintenance';

export async function PATCH(req: Request) {
  try {
    await ensureNeonAwake();
    const isAdmin = await verifyAdminRequest(req, prisma);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso restrito a contas de Administrador.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const sanitized = sanitizeMaintenanceConfig({
      disabledViews: body.disabledViews,
      message: sanitizeText(body.message, 500),
      updatedAt: new Date().toISOString(),
    });

    const serialized = JSON.stringify(sanitized);

    const existing = await prisma.auditLog.findFirst({
      where: {
        action: MAINTENANCE_AUDIT_ACTION,
        entity: MAINTENANCE_AUDIT_ENTITY,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (existing) {
      await prisma.auditLog.update({
        where: { id: existing.id },
        data: {
          details: serialized,
          timestamp: new Date(),
        },
      });
    } else {
      await prisma.auditLog.create({
        data: {
          action: MAINTENANCE_AUDIT_ACTION,
          entity: MAINTENANCE_AUDIT_ENTITY,
          details: serialized,
        },
      });
    }

    return NextResponse.json(sanitized);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao salvar modo manutenção') },
      { status: 500 }
    );
  }
}
