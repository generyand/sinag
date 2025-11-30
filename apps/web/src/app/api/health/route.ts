/**
 * Health check endpoint for Next.js frontend
 * Used by Docker health checks and load balancers
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: 'sinag-web',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
