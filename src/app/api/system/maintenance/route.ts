import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import {
  DEFAULT_MAINTENANCE_CONFIG,
  MAINTENANCE_AUDIT_ACTION,
  MAINTENANCE_AUDIT_ENTITY,
  sanitizeMaintenanceConfig,
} from '@/lib/maintenance';

export async function GET() {
  try {
    await ensureNeonAwake();
    const record = await prisma.auditLog.findFirst({
      where: {
        action: MAINTENANCE_AUDIT_ACTION,
        entity: MAINTENANCE_AUDIT_ENTITY,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!record?.details) {
      return NextResponse.json(DEFAULT_MAINTENANCE_CONFIG);
    }

    try {
      const parsed = JSON.parse(record.details);
      return NextResponse.json(sanitizeMaintenanceConfig(parsed));
    } catch {
      return NextResponse.json(DEFAULT_MAINTENANCE_CONFIG);
    }
  } catch {
    return NextResponse.json(DEFAULT_MAINTENANCE_CONFIG);
  }
}
