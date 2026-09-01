import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword, createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        roles: true,
        scopes: true,
        organization: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Prepare session metadata
    const sessionData = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles.map((r) => r.role),
      scopes: user.scopes.map((s) => ({
        scopeType: s.scopeType,
        scopeId: s.scopeId,
      })),
    };

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
        },
        roles: sessionData.roles,
        scopes: sessionData.scopes,
      },
    });

    // Write cookies session
    await createSession(sessionData, response);

    return response;
  } catch (err: any) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
