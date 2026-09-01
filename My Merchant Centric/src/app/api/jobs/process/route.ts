import { NextResponse } from 'next/server';
import { processNextJob } from '@/lib/queue/worker';

export async function POST() {
  const result = await processNextJob();
  return NextResponse.json(result);
}

export async function GET() {
  // Allow GET requests for simple manual triggering / cron execution in development
  const result = await processNextJob();
  return NextResponse.json(result);
}
