import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isTenantLocked = session.authSource === 'BRASA_MEAT_SSO';
    const isCorporateAdmin = session.roles.includes(Role.CORPORATE_ADMIN) || session.scopes.some(s => s.scopeId === '*');
    const canSwitchOrganization = !isTenantLocked && isCorporateAdmin;

    let organizations = [];
    if (canSwitchOrganization) {
      organizations = await db.organization.findMany({
        where: {
          locations: { some: {} }
        },
        select: {
          id: true,
          name: true,
          slug: true,
          brasaOrganizationId: true,
          _count: {
            select: { locations: true }
          }
        },
        orderBy: { name: 'asc' }
      });
    } else {
      organizations = await db.organization.findMany({
        where: { id: session.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          brasaOrganizationId: true,
          _count: {
            select: { locations: true }
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      currentOrganizationId: session.organizationId,
      canSwitchOrganization: canSwitchOrganization && organizations.length > 1,
      organizations
    });
  } catch (err: any) {
    console.error('Fetch organizations error:', err);
    return NextResponse.json({ error: err?.message || 'Error fetching organizations' }, { status: 500 });
  }
}
