import { NextResponse } from 'next/server';
import { runPhase7ANetworkRegistryAudit } from '@/lib/scout/networkRegistryEngine';

export async function GET() {
  try {
    const report = await runPhase7ANetworkRegistryAudit();
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Failed to generate Network Registry report:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
